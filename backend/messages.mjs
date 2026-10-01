// Conversaciones privadas: participantes, idempotencia, cursores de lectura y cierres independientes.
import {randomUUID} from 'node:crypto';

export function installMessages(db){
 db.exec(`CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES cases(id),owner_id TEXT NOT NULL REFERENCES users(id),visitor_id TEXT NOT NULL REFERENCES users(id),owner_read INTEGER NOT NULL DEFAULT 0,visitor_read INTEGER NOT NULL DEFAULT 0,owner_closed INTEGER NOT NULL DEFAULT 0,visitor_closed INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL,UNIQUE(case_id,visitor_id));
 CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,conversation_id TEXT NOT NULL REFERENCES conversations(id),sender_id TEXT NOT NULL REFERENCES users(id),text TEXT NOT NULL,client_id TEXT NOT NULL,created TEXT NOT NULL,UNIQUE(sender_id,client_id));
 CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id,id);
 CREATE INDEX IF NOT EXISTS messages_sender_created ON messages(sender_id,created);
 CREATE INDEX IF NOT EXISTS conversations_owner ON conversations(owner_id);
 CREATE INDEX IF NOT EXISTS conversations_visitor ON conversations(visitor_id);`);
 db.exec(`CREATE TABLE IF NOT EXISTS conversation_cases(conversation_id TEXT NOT NULL REFERENCES conversations(id),case_id TEXT NOT NULL REFERENCES cases(id),PRIMARY KEY(conversation_id,case_id));`);
 const participant=(row,user)=>row&&(row.owner_id===user.id||row.visitor_id===user.id);
 const caseHidden=id=>db.prepare("SELECT 1 FROM moderation WHERE case_id=? AND visibility='hidden'").get(id);
 function caseReference(id){
  const pet=db.prepare('SELECT id,kind,state,body FROM cases WHERE id=?').get(id);
  if(!pet||caseHidden(id))return {id,available:false};
  const photo=db.prepare('SELECT id FROM images WHERE case_id=? ORDER BY rowid LIMIT 1').get(id);
  return {id,available:true,name:JSON.parse(pet.body).name,kind:pet.kind,state:pet.state,image:photo?'/api/v1/images/'+photo.id:''};
 }
 function summary(row,user,details=false){
  const owner=row.owner_id===user.id,read=owner?row.owner_read:row.visitor_read;
  const peer=db.prepare('SELECT name FROM users WHERE id=?').get(owner?row.visitor_id:row.owner_id);
  const pet=db.prepare('SELECT body,state FROM cases WHERE id=?').get(row.case_id);
  const hidden=!pet||!!caseHidden(row.case_id),last=db.prepare('SELECT text,created FROM messages WHERE conversation_id=? ORDER BY id DESC LIMIT 1').get(row.id);
  return {id:row.id,caseId:row.case_id,caseName:hidden?'Caso no disponible':JSON.parse(pet.body).name,caseState:pet?.state,peerName:peer?.name||'Contacto',lastText:last?.text.slice(0,160)||'',lastCreated:last?.created||row.created,...(details?{cases:[caseReference(row.case_id),...db.prepare('SELECT case_id FROM conversation_cases WHERE conversation_id=? ORDER BY rowid LIMIT 10').all(row.id).map(item=>caseReference(item.case_id))]}:{}),closedByMe:!!(owner?row.owner_closed:row.visitor_closed),closedByOther:!!(owner?row.visitor_closed:row.owner_closed),caseHidden:hidden,unread:db.prepare('SELECT count(*) AS n FROM messages WHERE conversation_id=? AND sender_id!=? AND id>?').get(row.id,user.id,read).n};
 }
 async function route({req,url,json,send,fail,requireUser}){
  const path=url.pathname,start=/^\/api\/v1\/cases\/([^/]+)\/conversations$/.exec(path);
  if(!start&&path!=='/api/v1/conversations'&&!path.startsWith('/api/v1/conversations/'))return false;
  const user=requireUser(req);
  const validate=body=>{if(typeof body.text!=='string'||!body.text.trim()||body.text.length>2000)fail(400,'Escribe entre 1 y 2000 caracteres.');if(typeof body.clientId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(body.clientId))fail(400,'Identificador de envío inválido.');};
  const rate=()=>{if(db.prepare('SELECT count(*) AS n FROM messages WHERE sender_id=? AND created>?').get(user.id,new Date(Date.now()-60000).toISOString()).n>=30)fail(429,'Has enviado muchos mensajes. Espera un minuto.');};
  const insert=(id,body)=>db.prepare('INSERT INTO messages(conversation_id,sender_id,text,client_id,created) VALUES(?,?,?,?,?)').run(id,user.id,body.text.trim(),body.clientId,new Date().toISOString());
  const previous=body=>db.prepare('SELECT * FROM messages WHERE sender_id=? AND client_id=?').get(user.id,body.clientId);
  if(start&&req.method==='POST'){
   const body=await json(req);
   const openOnly=body.openOnly===true;if(!openOnly)validate(body);
   if(!/^[a-zA-Z0-9-]{1,80}$/.test(start[1]))fail(400,'Identificador de caso inválido.');
   const pet=db.prepare('SELECT * FROM cases WHERE id=?').get(start[1]);
   if(!pet||caseHidden(pet.id))fail(404,'Caso no disponible para contacto.');
   if(pet.owner_id===user.id)fail(400,'No puedes iniciar una conversación contigo mismo.');
   let related;
   if(body.relatedCaseId!==undefined){
    if(typeof body.relatedCaseId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(body.relatedCaseId))fail(400,'Identificador de reporte relacionado inválido.');
    related=db.prepare('SELECT * FROM cases WHERE id=?').get(body.relatedCaseId);
    if(!related||caseHidden(related.id))fail(404,'El reporte relacionado no está disponible.');
    if(!['lost','found'].includes(pet.kind)||related.kind!==(pet.kind==='lost'?'found':'lost'))fail(400,'Relaciona un reporte perdido con uno encontrado.');
   }
   let row=related?db.prepare(`SELECT c.* FROM conversations c JOIN conversation_cases r ON r.conversation_id=c.id WHERE ((c.case_id=? AND r.case_id=?) OR (c.case_id=? AND r.case_id=?)) AND ((c.owner_id=? AND c.visitor_id=?) OR (c.owner_id=? AND c.visitor_id=?)) ORDER BY c.created,c.id LIMIT 1`).get(pet.id,related.id,related.id,pet.id,pet.owner_id,user.id,user.id,pet.owner_id):null;
   row ||= db.prepare('SELECT * FROM conversations WHERE case_id=? AND visitor_id=?').get(pet.id,user.id);
   const duplicate=openOnly?null:previous(body);if(duplicate){if(!row||duplicate.conversation_id!==row.id||duplicate.text!==body.text.trim())fail(409,'El identificador de envío ya se utilizó.');send(200,{id:row.id});return true;}
   if(!row&&pet.state==='resolved')fail(409,'El caso ya está resuelto. No se abren nuevos contactos; las conversaciones anteriores conservan su historial.');
   if(!openOnly&&row&&(row.owner_closed||row.visitor_closed))fail(409,'Esta conversación está cerrada. Puedes consultarla en Mensajes.');
   if(!openOnly)rate();
   if(!row&&db.prepare('SELECT count(*) AS n FROM conversations WHERE visitor_id=? AND created>?').get(user.id,new Date(Date.now()-86400000).toISOString()).n>=10)fail(429,'Puedes iniciar hasta 10 conversaciones al día.');
   const isNew=!row;
   const relatedId=related&&related.id!==row?.case_id?related.id:null;
   if(row&&relatedId&&!db.prepare('SELECT 1 FROM conversation_cases WHERE conversation_id=? AND case_id=?').get(row.id,relatedId)&&db.prepare('SELECT count(*) AS n FROM conversation_cases WHERE conversation_id=?').get(row.id).n>=10)fail(409,'La conversación ya tiene diez reportes relacionados. Abre el contacto existente desde Mensajes.');
   db.exec('BEGIN');
   try{if(!row){row={id:randomUUID()};db.prepare('INSERT INTO conversations(id,case_id,owner_id,visitor_id,created) VALUES(?,?,?,?,?)').run(row.id,pet.id,pet.owner_id,user.id,new Date().toISOString());}if(relatedId)db.prepare('INSERT OR IGNORE INTO conversation_cases VALUES(?,?)').run(row.id,relatedId);if(!openOnly)insert(row.id,body);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
   send(isNew||!openOnly?201:200,{id:row.id});return true;
  }
  if(path==='/api/v1/conversations'&&req.method==='GET'){
   const raw=Number(url.searchParams.get('offset')),offset=Number.isSafeInteger(raw)&&raw>=0?raw:0,limit=20;
   const total=db.prepare('SELECT count(*) AS n FROM conversations WHERE owner_id=? OR visitor_id=?').get(user.id,user.id).n;
   const rows=db.prepare('SELECT c.* FROM conversations c WHERE owner_id=? OR visitor_id=? ORDER BY coalesce((SELECT max(created) FROM messages WHERE conversation_id=c.id),c.created) DESC,c.id DESC LIMIT ? OFFSET ?').all(user.id,user.id,limit,offset);
   send(200,{items:rows.map(row=>summary(row,user)),total,offset,limit});return true;
  }
  const match=/^\/api\/v1\/conversations\/([^/]+)(?:\/(messages|read))?$/.exec(path);
  if(!match)fail(404,'Conversación no encontrada.');
  if(!/^[a-zA-Z0-9-]{1,80}$/.test(match[1]))fail(400,'Identificador de conversación inválido.');
  let row=db.prepare('SELECT * FROM conversations WHERE id=?').get(match[1]);
  if(!participant(row,user))fail(404,'Conversación no encontrada.');
  if(req.method==='GET'&&!match[2]){
   const raw=Number(url.searchParams.get('before')),before=Number.isSafeInteger(raw)&&raw>0?raw:Number.MAX_SAFE_INTEGER;
   const rows=db.prepare('SELECT id,sender_id,text,created FROM messages WHERE conversation_id=? AND id<? ORDER BY id DESC LIMIT 41').all(row.id,before);
   const hasMore=rows.length>40;const items=rows.slice(0,40).reverse().map(m=>({id:m.id,text:m.text,created:m.created,mine:m.sender_id===user.id}));
   send(200,{...summary(row,user,true),items,hasMore,nextBefore:items[0]?.id||null});return true;
  }
  if(req.method==='POST'&&match[2]==='messages'){
   const body=await json(req);validate(body);row=db.prepare('SELECT * FROM conversations WHERE id=?').get(row.id);
   const duplicate=previous(body);if(duplicate){if(duplicate.conversation_id!==row.id||duplicate.text!==body.text.trim())fail(409,'El identificador de envío ya se utilizó.');send(200,{ok:true});return true;}
   if(row.owner_closed||row.visitor_closed||caseHidden(row.case_id))fail(409,'No se pueden enviar mensajes: la conversación está cerrada o el caso está oculto.');
   rate();insert(row.id,body);send(201,{ok:true});return true;
  }
  if(req.method==='POST'&&match[2]==='read'){
   const body=await json(req);if(!Number.isSafeInteger(body.lastId)||body.lastId<1||!db.prepare('SELECT id FROM messages WHERE conversation_id=? AND id=?').get(row.id,body.lastId))fail(400,'Mensaje inválido.');
   const column=row.owner_id===user.id?'owner_read':'visitor_read';
   db.prepare(`UPDATE conversations SET ${column}=max(${column},?) WHERE id=?`).run(body.lastId,row.id);send(200,{ok:true});return true;
  }
  if(req.method==='PATCH'&&!match[2]){
   const body=await json(req);if(typeof body.closed!=='boolean')fail(400,'Estado inválido.');
   const column=row.owner_id===user.id?'owner_closed':'visitor_closed';
   db.prepare(`UPDATE conversations SET ${column}=? WHERE id=?`).run(body.closed?1:0,row.id);send(200,{ok:true});return true;
  }
  fail(405,'Método no permitido.');
 }
 return {route};
}
