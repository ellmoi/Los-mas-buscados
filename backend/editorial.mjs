import {randomUUID} from 'node:crypto';

export function installEditorial(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS editorial (
    id TEXT PRIMARY KEY, body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','hidden')),
    revision INTEGER NOT NULL DEFAULT 1, reviewed_on TEXT,
    created TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS editorial_status ON editorial(status,created);`);
  const pack=row=>({...JSON.parse(row.body),id:row.id,status:row.status,revision:row.revision,reviewedOn:row.reviewed_on,updated:row.updated});
  const transaction=action=>{db.exec('BEGIN');try{action();db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}};
  async function route({req,url,json,send,fail,requireUser}) {
    const path=url.pathname,publicBase='/api/v1/editorial',adminBase='/api/v1/admin/editorial';
    const adminPath=path===adminBase||path.startsWith(adminBase+'/');
    if(!adminPath&&path!==publicBase&&!path.startsWith(publicBase+'/'))return false;
    const base=adminPath?adminBase:publicBase;
    let admin;
    if(adminPath){admin=requireUser(req);if(admin.role!=='ADMIN')fail(403,'Acceso administrativo restringido.');}
    const validate=body=>{
      const data={};
      if(!['article','project'].includes(body.kind))fail(400,'Selecciona información o proyecto.');
      data.kind=body.kind;
      for(const [field,max] of [['title',160],['summary',500],['text',20000],['sourceUrl',500]]){
        if(typeof body[field]!=='string'||!body[field].trim()||body[field].length>max)fail(400,'Revisa el campo '+field+'.');
        data[field]=body[field].trim();
      }
      try{const source=new URL(data.sourceUrl);if(source.protocol!=='https:'||source.username||source.password)throw Error();data.sourceUrl=source.href;}
      catch{fail(400,'La fuente debe ser una URL HTTPS sin credenciales.');}
      return data;
    };
    const audit=(action,id,reason)=>db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(randomUUID(),admin.id,action,id,reason,new Date().toISOString());
    if(path===base&&req.method==='GET'){
      const offset=Number(url.searchParams.get('offset'));
      if(!Number.isSafeInteger(offset)||offset<0)fail(400,'Página inválida.');
      const where=[],args=[];
      if(!adminPath)where.push("status='published'");
      else if(url.searchParams.has('status')&&url.searchParams.get('status')!=='all'){
        const status=url.searchParams.get('status');
        if(!['draft','published','hidden'].includes(status))fail(400,'Estado inválido.');
        where.push('status=?');args.push(status);
      }
      if(url.searchParams.has('kind')){
        const kind=url.searchParams.get('kind');if(!['article','project'].includes(kind))fail(400,'Tipo inválido.');
        where.push("json_extract(body,'$.kind')=?");args.push(kind);
      }
      const q=url.searchParams.get('q')?.trim();
      if(q){where.push("instr(lower(json_extract(body,'$.title') || ' ' || json_extract(body,'$.summary')),lower(?))>0");args.push(q.slice(0,160));}
      const clause=where.length?' WHERE '+where.join(' AND '):'',limit=20;
      const total=db.prepare('SELECT count(*) AS n FROM editorial'+clause).get(...args).n;
      const items=db.prepare('SELECT * FROM editorial'+clause+' ORDER BY created DESC,id DESC LIMIT ? OFFSET ?').all(...args,limit,offset).map(pack);
      send(200,{items,total,offset,limit});return true;
    }
    if(path===base&&adminPath&&req.method==='POST'){
      const data=validate(await json(req)),id=randomUUID(),now=new Date().toISOString();
      transaction(()=>{db.prepare('INSERT INTO editorial(id,body,created,updated) VALUES(?,?,?,?)').run(id,JSON.stringify(data),now,now);audit('create_editorial',id,'Contenido creado como borrador.');});
      send(201,pack(db.prepare('SELECT * FROM editorial WHERE id=?').get(id)));return true;
    }
    if(path===base)fail(405,'Método no permitido.');
    const match=/^\/([^/]+)(?:\/(review))?$/.exec(path.slice(base.length));
    if(!match||(!adminPath&&match[2]))fail(404,'Contenido no encontrado.');
    // Leer la versión después del cuerpo evita aceptar dos escrituras concurrentes.
    const body=req.method==='PATCH'&&adminPath?await json(req):null;
    const row=db.prepare('SELECT * FROM editorial WHERE id=?').get(match[1]);
    if(!row||(!adminPath&&row.status!=='published'))fail(404,'Contenido no encontrado.');
    if(req.method==='GET'&&!match[2]){send(200,pack(row));return true;}
    if(req.method!=='PATCH'||!adminPath)fail(405,'Método no permitido.');
    if(body.revision!==row.revision)fail(409,'El contenido cambió. Vuelve a abrirlo antes de guardar.');
    if(typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>500)fail(400,'Registra una justificación de 10 a 500 caracteres.');
    const now=new Date().toISOString();
    if(match[2]){
      if(!['published','hidden'].includes(body.status))fail(400,'Selecciona publicar u ocultar.');
      if(body.status==='published'){
        const value=body.reviewedOn;
        if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value||value>now.slice(0,10))fail(400,'Registra una fecha de revisión válida, no futura.');
        validate(JSON.parse(row.body));
      }
      transaction(()=>{db.prepare('UPDATE editorial SET status=?,reviewed_on=?,revision=revision+1,updated=? WHERE id=?').run(body.status,body.status==='published'?body.reviewedOn:row.reviewed_on,now,row.id);audit(body.status==='published'?'publish_editorial':'hide_editorial',row.id,body.reason.trim());});
    }else{
      const data=validate({...JSON.parse(row.body),...body});
      transaction(()=>{db.prepare("UPDATE editorial SET body=?,status='draft',reviewed_on=NULL,revision=revision+1,updated=? WHERE id=?").run(JSON.stringify(data),now,row.id);audit('edit_editorial',row.id,body.reason.trim());});
    }
    send(200,pack(db.prepare('SELECT * FROM editorial WHERE id=?').get(row.id)));return true;
  }
  return {route};
}
