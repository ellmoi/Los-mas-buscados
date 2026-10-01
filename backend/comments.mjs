import {createHash,randomUUID} from 'node:crypto';

export function installComments(db){
  db.exec(`CREATE TABLE IF NOT EXISTS comments(
    id INTEGER PRIMARY KEY AUTOINCREMENT,case_id TEXT NOT NULL REFERENCES cases(id),
    author_id TEXT NOT NULL REFERENCES users(id),text TEXT NOT NULL,client_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible','hidden','deleted')),
    revision INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL,updated TEXT NOT NULL,
    UNIQUE(author_id,client_id));
    CREATE INDEX IF NOT EXISTS comments_case ON comments(case_id,id);
    CREATE TABLE IF NOT EXISTS comment_limits(user_id TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);`);
  const count=id=>db.prepare("SELECT count(*) AS n FROM comments WHERE case_id=? AND status='visible'").get(id).n;
  const pack=(row,user)=>({id:row.id,caseId:row.case_id,authorName:row.author_name,text:row.text,status:row.status,revision:row.revision,created:row.created,updated:row.updated,canReport:!!user&&row.author_id!==user.id&&row.status==='visible',canEdit:row.author_id===user?.id&&row.status!=='deleted'});
  const select='SELECT c.*,u.name AS author_name FROM comments c JOIN users u ON u.id=c.author_id';
  async function route({req,url,json,send,fail,requireUser,currentUser}){
    const list=/^\/api\/v1\/cases\/([^/]+)\/comments$/.exec(url.pathname);
    const edit=/^\/api\/v1\/comments\/([1-9]\d*)$/.exec(url.pathname);
    const adminList=url.pathname==='/api/v1/admin/comments';
    const moderate=/^\/api\/v1\/admin\/comments\/([1-9]\d*)$/.exec(url.pathname);
    if(!list&&!edit&&!adminList&&!moderate)return false;
    const admin=adminList||moderate,user=admin||req.method!=='GET'?requireUser(req):currentUser(req);
    if(admin&&user.role!=='ADMIN')fail(403,'Acceso administrativo restringido.');
    const visibleCase=id=>{
      if(!db.prepare("SELECT 1 FROM cases WHERE id=? AND NOT EXISTS(SELECT 1 FROM moderation WHERE case_id=cases.id AND visibility='hidden')").get(id))fail(404,'Caso no disponible para comentarios.');
    };
    const text=body=>{if(typeof body.text!=='string'||!body.text.trim()||body.text.length>1000)fail(400,'Escribe entre 1 y 1000 caracteres.');return body.text.trim();};
    const limit=()=>{
      const time=Date.now();db.prepare('DELETE FROM comment_limits WHERE until<=?').run(time);
      db.prepare('INSERT INTO comment_limits VALUES(?,1,?) ON CONFLICT(user_id) DO UPDATE SET count=count+1').run(user.id,time+60000);
      if(db.prepare('SELECT count FROM comment_limits WHERE user_id=?').get(user.id).count>10)fail(429,'Puedes realizar diez cambios de comentarios por minuto.');
    };
    if(list)visibleCase(list[1]);
    if((list||adminList)&&req.method==='GET'){
      const raw=url.searchParams.get('before'),before=raw===null?Number.MAX_SAFE_INTEGER:Number(raw);
      if(!Number.isSafeInteger(before)||before<=0)fail(400,'Página inválida.');
      const where=['c.id<?'],args=[before];
      if(list){where.push('c.case_id=?',"(c.status='visible' OR (c.author_id=? AND c.status='hidden'))");args.push(list[1],user?.id||'');}
      else{
        const status=url.searchParams.get('status')||'visible';
        if(!['visible','hidden','deleted','all'].includes(status))fail(400,'Estado inválido.');
        if(status!=='all'){where.push('c.status=?');args.push(status);}
      }
      const rows=db.prepare(select+' WHERE '+where.join(' AND ')+' ORDER BY c.id DESC LIMIT 21').all(...args),hasMore=rows.length>20;
      const items=rows.slice(0,20).map(row=>pack(row,user));
      send(200,{items,hasMore,nextBefore:hasMore?items.at(-1).id:null});return true;
    }
    if(list&&req.method==='POST'){
      const body=await json(req),value=text(body);visibleCase(list[1]);
      if(typeof body.clientId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(body.clientId))fail(400,'Identificador de envío inválido.');
      const hash=createHash('sha256').update(value).digest('hex');
      const previous=db.prepare(select+' WHERE c.author_id=? AND c.client_id=?').get(user.id,body.clientId);
      if(previous){if(previous.case_id!==list[1]||previous.request_hash!==hash)fail(409,'El identificador ya corresponde a otro comentario.');send(200,pack(previous,user));return true;}
      limit();
      if(db.prepare('SELECT count(*) AS n FROM comments WHERE author_id=? AND created>?').get(user.id,new Date(Date.now()-86400000).toISOString()).n>=50)fail(429,'Puedes publicar hasta 50 comentarios al día.');
      const now=new Date().toISOString();
      const inserted=db.prepare('INSERT INTO comments(case_id,author_id,text,client_id,request_hash,created,updated) VALUES(?,?,?,?,?,?,?)').run(list[1],user.id,value,body.clientId,hash,now,now);
      send(201,pack(db.prepare(select+' WHERE c.id=?').get(inserted.lastInsertRowid),user));return true;
    }
    if((edit||moderate)&&req.method==='PATCH'){
      const body=await json(req),id=Number((edit||moderate)[1]);
      if(!Number.isSafeInteger(id))fail(404,'Comentario no encontrado.');
      const row=db.prepare(select+' WHERE c.id=?').get(id);if(!row)fail(404,'Comentario no encontrado.');
      if(!admin){visibleCase(row.case_id);if(row.author_id!==user.id)fail(403,'Solo el autor puede modificar este comentario.');}
      if(row.revision!==body.revision)fail(409,'El comentario cambió. Actualiza antes de continuar.');
      if(row.status==='deleted')fail(409,'El comentario fue retirado y no puede recuperarse.');
      let value=row.text,status=row.status;
      if(admin){
        if(!['visible','hidden'].includes(body.status))fail(400,'Selecciona ocultar o restaurar.');
        if(typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>500)fail(400,'Registra una justificación de 10 a 500 caracteres.');
        status=body.status;
      }else{
        if(body.status==='deleted'){value='';status='deleted';}
        else{if(body.status!==undefined)fail(400,'No puedes cambiar la moderación del comentario.');value=text(body);}
        limit();
      }
      const now=new Date().toISOString();db.exec('BEGIN');
      try{
        db.prepare('UPDATE comments SET text=?,status=?,revision=revision+1,updated=? WHERE id=?').run(value,status,now,id);
        if(admin)db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(randomUUID(),user.id,status==='hidden'?'hide_comment':'restore_comment',String(id),body.reason.trim(),now);
        db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
      send(200,pack(db.prepare(select+' WHERE c.id=?').get(id),user));return true;
    }
    fail(405,'Método no permitido.');
  }
  return {route,count};
}
