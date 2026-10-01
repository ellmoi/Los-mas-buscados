// Moderación: ocultar cambia visibilidad, no borra el caso. Cada decisión administrativa se audita.
import {randomUUID} from 'node:crypto';

export function installModeration(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS moderation(case_id TEXT PRIMARY KEY REFERENCES cases(id),visibility TEXT NOT NULL CHECK(visibility IN ('visible','hidden')),reason TEXT NOT NULL,updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES cases(id),reporter_id TEXT NOT NULL REFERENCES users(id),reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed','dismissed')),created TEXT NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS reports_pending ON reports(case_id,reporter_id) WHERE status='pending';
    CREATE INDEX IF NOT EXISTS reports_status_created ON reports(status,created);
    CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,target_id TEXT NOT NULL,reason TEXT NOT NULL,created TEXT NOT NULL);`);
  const visibility = id => db.prepare('SELECT * FROM moderation WHERE case_id=?').get(id);
  const canView = (row,user) => visibility(row.id)?.visibility !== 'hidden' || user?.id === row.owner_id || user?.role === 'ADMIN';
  const audit = (actor,action,target,reason) => db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(randomUUID(),actor,action,target,reason,new Date().toISOString());
  const publicClause = "NOT EXISTS(SELECT 1 FROM moderation m WHERE m.case_id=cases.id AND m.visibility='hidden')";
  const metadata = (row,user) => {
    const entry=visibility(row.id);
    return {visibility:entry?.visibility || 'visible',...(entry && (user?.id===row.owner_id || user?.role==='ADMIN')?{moderationReason:entry.reason}:{})};
  };
  async function route({req,url,json,send,fail,requireUser,pack}) {
    const path=url.pathname;
    const reportPath=/^\/api\/v1\/cases\/([^/]+)\/reports$/.exec(path);
    if(reportPath && req.method==='POST') {
      const user=requireUser(req),body=await json(req);
      const row=db.prepare('SELECT * FROM cases WHERE id=?').get(reportPath[1]);
      if(!row || !canView(row,user))fail(404,'Caso no encontrado.');
      if(row.owner_id===user.id)fail(400,'No puedes denunciar tu propio caso.');
      if(typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>500)fail(400,'Explica el motivo entre 10 y 500 caracteres.');
      if(db.prepare("SELECT count(*) AS n FROM reports WHERE reporter_id=? AND created>?").get(user.id,new Date(Date.now()-86400000).toISOString()).n>=20)fail(429,'Alcanzaste el límite de 20 reportes diarios.');
      try{db.prepare('INSERT INTO reports(id,case_id,reporter_id,reason,created) VALUES(?,?,?,?,?)').run(randomUUID(),row.id,user.id,body.reason.trim(),new Date().toISOString());}
      catch(error){if(error.message.includes('UNIQUE'))fail(409,'Ya tienes un reporte pendiente para este caso.');throw error;}
      send(201,{ok:true});return true;
    }
    if(!path.startsWith('/api/v1/admin/'))return false;
    const admin=requireUser(req);if(admin.role!=='ADMIN')fail(403,'Acceso administrativo restringido.');
    const page=(table,where='',args=[])=>{
      const raw=Number(url.searchParams.get('offset')),offset=Number.isSafeInteger(raw)&&raw>=0?raw:0,limit=25;
      const total=db.prepare(`SELECT count(*) AS n FROM ${table} ${where}`).get(...args).n;
      return {total,offset,limit};
    };
    if(path==='/api/v1/admin/summary'&&req.method==='GET'){
      send(200,{users:db.prepare('SELECT count(*) AS n FROM users').get().n,cases:db.prepare('SELECT count(*) AS n FROM cases').get().n,pending:db.prepare("SELECT count(*) AS n FROM reports WHERE status='pending'").get().n,hidden:db.prepare("SELECT count(*) AS n FROM moderation WHERE visibility='hidden'").get().n});return true;
    }
    if(path==='/api/v1/admin/cases'&&req.method==='GET'){
      const filter=url.searchParams.get('visibility'),where=filter==='hidden'?`WHERE NOT (${publicClause})`:filter==='visible'?`WHERE ${publicClause}`:'';
      const paging=page('cases',where);const rows=db.prepare(`SELECT * FROM cases ${where} ORDER BY created DESC,id DESC LIMIT ? OFFSET ?`).all(paging.limit,paging.offset);
      send(200,{...paging,items:rows.map(row=>pack(row,admin))});return true;
    }
    if(path==='/api/v1/admin/reports'&&req.method==='GET'){
      const status=url.searchParams.get('status')||'pending';if(!['pending','reviewed','dismissed'].includes(status))fail(400,'Estado inválido.');
      const paging=page('reports','WHERE status=?',[status]);
      const rows=db.prepare('SELECT r.*,json_extract(c.body,\'$.name\') AS caseName FROM reports r JOIN cases c ON c.id=r.case_id WHERE r.status=? ORDER BY r.created DESC,r.id DESC LIMIT ? OFFSET ?').all(status,paging.limit,paging.offset);
      send(200,{...paging,items:rows});return true;
    }
    if(path==='/api/v1/admin/audit'&&req.method==='GET'){
      const paging=page('audit');const items=db.prepare('SELECT a.*,u.name AS actorName FROM audit a JOIN users u ON u.id=a.actor_id ORDER BY a.created DESC,a.id DESC LIMIT ? OFFSET ?').all(paging.limit,paging.offset);
      send(200,{...paging,items});return true;
    }
    const casePath=/^\/api\/v1\/admin\/cases\/([^/]+)\/moderation$/.exec(path);
    const reportAction=/^\/api\/v1\/admin\/reports\/([^/]+)$/.exec(path);
    if((casePath||reportAction)&&req.method==='PATCH'){
      const body=await json(req);
      if(typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>500)fail(400,'Registra una justificación entre 10 y 500 caracteres.');
      const reason=body.reason.trim();
      db.exec('BEGIN');
      try{
        if(casePath){
          const id=casePath[1];if(!db.prepare('SELECT id FROM cases WHERE id=?').get(id))fail(404,'Caso no encontrado.');
          if(!['visible','hidden'].includes(body.visibility))fail(400,'Visibilidad inválida.');
          db.prepare('INSERT INTO moderation VALUES(?,?,?,?) ON CONFLICT(case_id) DO UPDATE SET visibility=excluded.visibility,reason=excluded.reason,updated=excluded.updated').run(id,body.visibility,reason,new Date().toISOString());
          if(body.visibility==='hidden')db.prepare("UPDATE reports SET status='reviewed' WHERE case_id=? AND status='pending'").run(id);
          audit(admin.id,body.visibility==='hidden'?'hide_case':'restore_case',id,reason);
        }else{
          const id=reportAction[1];if(!['reviewed','dismissed'].includes(body.status))fail(400,'Estado inválido.');
          if(!db.prepare('SELECT id FROM reports WHERE id=?').get(id))fail(404,'Reporte no encontrado.');
          const result=db.prepare("UPDATE reports SET status=? WHERE id=? AND status='pending'").run(body.status,id);
          if(!result.changes)fail(409,'Este reporte ya fue atendido.');
          audit(admin.id,body.status==='dismissed'?'dismiss_report':'review_report',id,reason);
        }
        db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
      send(200,{ok:true});return true;
    }
    fail(404,'Servicio administrativo no encontrado.');
  }
  return {route,metadata,canView,publicClause};
}
