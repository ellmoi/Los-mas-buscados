import {randomUUID} from 'node:crypto';

export function installCommentReports(db){
  db.exec(`CREATE TABLE IF NOT EXISTS comment_reports(
    id INTEGER PRIMARY KEY AUTOINCREMENT,comment_id INTEGER NOT NULL REFERENCES comments(id),
    reporter_id TEXT NOT NULL REFERENCES users(id),reason TEXT NOT NULL,reported_revision INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed','dismissed')),
    decision TEXT,resolution TEXT,resolved_by TEXT REFERENCES users(id),created TEXT NOT NULL,resolved_at TEXT,
    UNIQUE(comment_id,reporter_id));
    CREATE INDEX IF NOT EXISTS comment_reports_status ON comment_reports(status,id);
    CREATE INDEX IF NOT EXISTS comment_reports_reporter ON comment_reports(reporter_id,created);`);
  async function route({req,url,json,send,fail,requireUser}){
    const report=/^\/api\/v1\/comments\/([1-9]\d*)\/reports$/.exec(url.pathname);
    const list=url.pathname==='/api/v1/admin/comment-reports';
    const resolve=/^\/api\/v1\/admin\/comment-reports\/([1-9]\d*)$/.exec(url.pathname);
    if(!report&&!list&&!resolve)return false;
    const user=requireUser(req);
    if(!report&&user.role!=='ADMIN')fail(403,'Acceso administrativo restringido.');
    const reason=value=>{if(typeof value!=='string'||value.trim().length<10||value.length>500)fail(400,'Escribe un motivo de 10 a 500 caracteres.');return value.trim();};
    if(report&&req.method==='POST'){
      const body=await json(req),text=reason(body.reason),id=Number(report[1]);
      if(!Number.isSafeInteger(id))fail(404,'Comentario no disponible.');
      const comment=db.prepare("SELECT c.* FROM comments c WHERE c.id=? AND c.status='visible' AND NOT EXISTS(SELECT 1 FROM moderation m WHERE m.case_id=c.case_id AND m.visibility='hidden')").get(id);
      if(!comment)fail(404,'Comentario no disponible.');
      if(comment.author_id===user.id)fail(400,'Puedes editar o retirar tu propio comentario.');
      const previous=db.prepare('SELECT reason FROM comment_reports WHERE comment_id=? AND reporter_id=?').get(id,user.id);
      if(previous){if(previous.reason!==text)fail(409,'Ya enviaste una denuncia sobre este comentario.');send(200,{message:'Denuncia registrada. El equipo revisará el comentario.'});return true;}
      if(db.prepare('SELECT count(*) AS n FROM comment_reports WHERE reporter_id=? AND created>?').get(user.id,new Date(Date.now()-86400000).toISOString()).n>=20)fail(429,'Puedes enviar hasta 20 denuncias de comentarios al día.');
      db.prepare('INSERT INTO comment_reports(comment_id,reporter_id,reason,reported_revision,created) VALUES(?,?,?,?,?)').run(id,user.id,text,comment.revision,new Date().toISOString());
      send(201,{message:'Denuncia registrada. El equipo revisará el comentario.'});return true;
    }
    if(list&&req.method==='GET'){
      const status=url.searchParams.get('status')||'pending',raw=url.searchParams.get('before'),before=raw===null?Number.MAX_SAFE_INTEGER:Number(raw);
      if(!['pending','reviewed','dismissed','all'].includes(status)||!Number.isSafeInteger(before)||before<=0)fail(400,'Filtro o página inválidos.');
      const where=status==='all'?'r.id<?':'r.id<? AND r.status=?',args=status==='all'?[before]:[before,status];
      const rows=db.prepare(`SELECT r.id,r.comment_id AS commentId,r.reason,r.reported_revision AS reportedRevision,r.status,r.decision,r.resolution,r.created,r.resolved_at AS resolvedAt,
        c.text,c.status AS commentStatus,c.revision AS commentRevision,c.case_id AS caseId,
        u.name AS reporterName,a.name AS authorName,actor.name AS resolverName
        FROM comment_reports r JOIN comments c ON c.id=r.comment_id JOIN users u ON u.id=r.reporter_id
        JOIN users a ON a.id=c.author_id LEFT JOIN users actor ON actor.id=r.resolved_by
        WHERE ${where} ORDER BY r.id DESC LIMIT 21`).all(...args);
      const items=rows.slice(0,20);send(200,{items,hasMore:rows.length>20,nextBefore:rows.length>20?items.at(-1).id:null});return true;
    }
    if(resolve&&req.method==='PATCH'){
      const body=await json(req),text=reason(body.reason),id=Number(resolve[1]);
      if(!Number.isSafeInteger(id))fail(404,'Denuncia no encontrada.');
      if(!['reviewed','dismissed','hide'].includes(body.decision))fail(400,'Selecciona una decisión válida.');
      const row=db.prepare('SELECT r.*,c.revision,c.status AS comment_status FROM comment_reports r JOIN comments c ON c.id=r.comment_id WHERE r.id=?').get(id);
      if(!row)fail(404,'Denuncia no encontrada.');
      if(row.status!=='pending')fail(409,'La denuncia ya fue atendida. Actualiza la bandeja.');
      if(body.commentRevision!==row.revision)fail(409,'El comentario cambió. Actualiza y revisa su estado actual.');
      if(body.decision==='hide'&&row.comment_status!=='visible')fail(409,'El comentario ya está oculto o retirado. Actualiza la bandeja.');
      const now=new Date().toISOString(),status=body.decision==='dismissed'?'dismissed':'reviewed';
      const audit=(action,target)=>db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(randomUUID(),user.id,action,String(target),text,now);
      db.exec('BEGIN');
      try{
        if(body.decision==='hide'){
          db.prepare("UPDATE comments SET status='hidden',revision=revision+1,updated=? WHERE id=?").run(now,row.comment_id);
          audit('hide_comment',row.comment_id);
        }
        db.prepare('UPDATE comment_reports SET status=?,decision=?,resolution=?,resolved_by=?,resolved_at=? WHERE id=?').run(status,body.decision,text,user.id,now,id);
        audit(body.decision==='dismissed'?'dismiss_comment_report':'review_comment_report',id);
        db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
      send(200,{ok:true});return true;
    }
    fail(405,'Método no permitido.');
  }
  return {route};
}
