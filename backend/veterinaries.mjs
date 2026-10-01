import {randomUUID} from 'node:crypto';

export function installVeterinaries(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS veterinaries(id TEXT PRIMARY KEY,body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','hidden')),
    revision INTEGER NOT NULL DEFAULT 1,verified_on TEXT,created TEXT NOT NULL,updated TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS veterinaries_status ON veterinaries(status,created);`);
  const pack=row=>({...JSON.parse(row.body),id:row.id,status:row.status,revision:row.revision,verifiedOn:row.verified_on,updated:row.updated});
  async function route({req,url,json,send,fail,requireUser}) {
    const path=url.pathname,adminPath=path.startsWith('/api/v1/admin/veterinaries');
    if(!adminPath&&path!=='/api/v1/veterinaries'&&!path.startsWith('/api/v1/veterinaries/'))return false;
    const base=adminPath?'/api/v1/admin/veterinaries':'/api/v1/veterinaries';
    let admin;if(adminPath){admin=requireUser(req);if(admin.role!=='ADMIN')fail(403,'Acceso administrativo restringido.');}
    const validate=body=>{
      const data={};
      for(const [key,max] of [['name',120],['city',80],['address',200],['phone',40],['hours',300],['services',300],['sourceUrl',500]]){
        if(typeof body[key]!=='string'||!body[key].trim()||body[key].length>max)fail(400,'Revisa el campo '+key+'.');
        data[key]=body[key].trim();
      }
      try{const source=new URL(data.sourceUrl);if(source.protocol!=='https:'||source.username||source.password)throw Error();data.sourceUrl=source.href;}catch{fail(400,'La fuente debe ser una URL HTTPS sin credenciales.');}
      if(!/^[+\d\s().-]{7,40}$/.test(data.phone))fail(400,'Escribe un teléfono de contacto válido.');
      return data;
    };
    const transaction=action=>{db.exec('BEGIN');try{action();db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}};
    const audit=(action,id,reason)=>db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(randomUUID(),admin.id,action,id,reason,new Date().toISOString());
    if(path===base&&req.method==='GET'){
      const offset=Number(url.searchParams.get('offset'));if(!Number.isSafeInteger(offset)||offset<0)fail(400,'Página inválida.');
      const where=[],args=[];
      if(!adminPath)where.push("status='published'");
      else if(url.searchParams.has('status')&&url.searchParams.get('status')!=='all'){
        const status=url.searchParams.get('status');if(!['draft','published','hidden'].includes(status))fail(400,'Estado inválido.');where.push('status=?');args.push(status);
      }
      // Parámetros enlazados: los filtros nunca se interpolan como SQL.
      for(const [param,field] of [['city','city'],['service','services'],['q','name']]){
        const value=url.searchParams.get(param)?.trim();if(value){where.push(`json_extract(body,'$.${field}') LIKE ?`);args.push('%'+value.slice(0,100)+'%');}
      }
      const clause=where.length?' WHERE '+where.join(' AND '):'',limit=20;
      const total=db.prepare('SELECT count(*) AS n FROM veterinaries'+clause).get(...args).n;
      const items=db.prepare('SELECT * FROM veterinaries'+clause+' ORDER BY created DESC,id DESC LIMIT ? OFFSET ?').all(...args,limit,offset).map(pack);
      send(200,{items,total,offset,limit});return true;
    }
    if(path===base&&adminPath&&req.method==='POST'){
      const data=validate(await json(req)),id=randomUUID(),now=new Date().toISOString();
      transaction(()=>{db.prepare('INSERT INTO veterinaries(id,body,created,updated) VALUES(?,?,?,?)').run(id,JSON.stringify(data),now,now);audit('create_vet',id,'Ficha creada como borrador para revisión.');});
      send(201,pack(db.prepare('SELECT * FROM veterinaries WHERE id=?').get(id)));return true;
    }
    const suffix=path.slice(base.length),match=/^\/([^/]+)(?:\/(review))?$/.exec(suffix);
    if(!match)fail(404,'Servicio no encontrado.');
    const body=req.method==='PATCH'?await json(req):null;
    const row=db.prepare('SELECT * FROM veterinaries WHERE id=?').get(match[1]);
    if(!row||(!adminPath&&row.status!=='published'))fail(404,'Establecimiento no encontrado.');
    if(req.method==='GET'&&!match[2]){send(200,pack(row));return true;}
    if(adminPath&&req.method==='PATCH'){
      if(body.revision!==row.revision)fail(409,'La ficha cambió. Actualiza la página antes de guardar.');
      if(typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>500)fail(400,'Registra una justificación de 10 a 500 caracteres.');
      const now=new Date().toISOString();
      if(match[2]){
        if(!['published','hidden'].includes(body.status))fail(400,'Selecciona publicar u ocultar.');
        if(body.status==='published'){
          const value=body.verifiedOn;
          if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value||value>now.slice(0,10))fail(400,'Registra una fecha de comprobación válida, no futura.');
          validate(JSON.parse(row.body));
        }
        transaction(()=>{db.prepare('UPDATE veterinaries SET status=?,verified_on=?,revision=revision+1,updated=? WHERE id=?').run(body.status,body.status==='published'?body.verifiedOn:row.verified_on,now,row.id);audit(body.status==='published'?'publish_vet':'hide_vet',row.id,body.reason.trim());});
      }else{
        const data=validate({...JSON.parse(row.body),...body});
        transaction(()=>{db.prepare("UPDATE veterinaries SET body=?,status='draft',verified_on=NULL,revision=revision+1,updated=? WHERE id=?").run(JSON.stringify(data),now,row.id);audit('edit_vet',row.id,body.reason.trim());});
      }
      send(200,pack(db.prepare('SELECT * FROM veterinaries WHERE id=?').get(row.id)));return true;
    }
    fail(405,'Método no permitido.');
  }
  return {route};
}
