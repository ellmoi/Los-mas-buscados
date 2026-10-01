import {randomUUID} from 'node:crypto';

export function installAdoptions(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS adoption_applications(
    id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES cases(id),
    applicant_id TEXT NOT NULL REFERENCES users(id),message TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','rejected','withdrawn')),
    created TEXT NOT NULL,updated TEXT NOT NULL,UNIQUE(case_id,applicant_id));
    CREATE INDEX IF NOT EXISTS adoption_applicant ON adoption_applications(applicant_id,created);
    CREATE UNIQUE INDEX IF NOT EXISTS adoption_one_accepted ON adoption_applications(case_id) WHERE state='accepted';`);
  const hidden=id=>!!db.prepare("SELECT 1 FROM moderation WHERE case_id=? AND visibility='hidden'").get(id);
  const notify=(user,kind,id)=>db.prepare('INSERT INTO notifications(user_id,kind,target_id,created) VALUES(?,?,?,?)').run(user,kind,id,new Date().toISOString());
  function transaction(action){db.exec('BEGIN');try{const result=action();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}
  const metadata=(row,user)=>row.kind==='adoption'?{
    canManageAdoption:user?.id===row.owner_id,
    myApplication:user?db.prepare('SELECT id,state FROM adoption_applications WHERE case_id=? AND applicant_id=?').get(row.id,user.id)||null:null
  }:{};
  async function route({req,url,json,send,fail,requireUser}) {
    const path=url.pathname;
    const apply=/^\/api\/v1\/cases\/([^/]+)\/adoption-applications$/.exec(path);
    const statePath=/^\/api\/v1\/cases\/([^/]+)\/adoption-state$/.exec(path);
    const itemPath=/^\/api\/v1\/adoption-applications\/([^/]+)$/.exec(path);
    if(!apply&&!statePath&&!itemPath&&path!=='/api/v1/adoption-applications')return false;
    const user=requireUser(req);
    if(apply&&req.method==='POST') {
      const body=await json(req);
      if(typeof body.message!=='string'||body.message.trim().length<20||body.message.length>2000)fail(400,'Explica tu interés entre 20 y 2000 caracteres.');
      const pet=db.prepare("SELECT * FROM cases WHERE id=? AND kind='adoption'").get(apply[1]);
      if(!pet||hidden(pet.id))fail(404,'Adopción no disponible.');
      if(pet.owner_id===user.id)fail(400,'No puedes solicitar tu propia adopción.');
      const previous=db.prepare('SELECT id,state,message FROM adoption_applications WHERE case_id=? AND applicant_id=?').get(pet.id,user.id);
      if(previous){if(previous.message!==body.message.trim())fail(409,'Ya enviaste una solicitud para esta mascota. Consúltala en Solicitudes de adopción.');send(200,{id:previous.id,state:previous.state});return true;}
      if(pet.state!=='available')fail(409,'Esta mascota no recibe nuevas solicitudes.');
      if(db.prepare('SELECT count(*) AS n FROM adoption_applications WHERE applicant_id=? AND created>?').get(user.id,new Date(Date.now()-86400000).toISOString()).n>=10)fail(429,'Puedes enviar hasta 10 solicitudes al día.');
      const id=randomUUID(),created=new Date().toISOString();
      transaction(()=>{db.prepare('INSERT INTO adoption_applications(id,case_id,applicant_id,message,created,updated) VALUES(?,?,?,?,?,?)').run(id,pet.id,user.id,body.message.trim(),created,created);notify(pet.owner_id,'adoption_application',id);});
      send(201,{id,state:'pending'});return true;
    }
    if(statePath&&req.method==='PATCH') {
      const body=await json(req);
      const pet=db.prepare("SELECT * FROM cases WHERE id=? AND kind='adoption'").get(statePath[1]);
      if(!pet||pet.owner_id!==user.id)fail(404,'Adopción no encontrada.');
      if(!['available','paused'].includes(body.state))fail(400,'Selecciona disponible o pausada.');
      if(pet.state==='adopted')fail(409,'Esta adopción ya fue confirmada y no puede reabrirse.');
      db.prepare('UPDATE cases SET state=? WHERE id=?').run(body.state,pet.id);
      send(200,{ok:true});return true;
    }
    const select=`SELECT a.*,c.owner_id,c.state AS caseState,json_extract(c.body,'$.name') AS caseName,
      u.name AS applicantName FROM adoption_applications a JOIN cases c ON c.id=a.case_id JOIN users u ON u.id=a.applicant_id`;
    const pack=row=>({id:row.id,caseId:row.case_id,caseName:row.caseName,caseState:row.caseState,
      caseHidden:hidden(row.case_id),applicantName:row.applicantName,message:row.message,state:row.state,
      created:row.created,updated:row.updated,canManage:row.owner_id===user.id,canWithdraw:row.applicant_id===user.id&&row.state==='pending'});
    if(path==='/api/v1/adoption-applications'&&req.method==='GET') {
      const role=url.searchParams.get('role')||'applicant';if(!['applicant','owner'].includes(role))fail(400,'Bandeja inválida.');
      const raw=Number(url.searchParams.get('offset'));if(!Number.isSafeInteger(raw)||raw<0)fail(400,'Página inválida.');
      const args=[user.id],where=[role==='owner'?'c.owner_id=?':'a.applicant_id=?'];
      if(url.searchParams.has('caseId')){where.push('a.case_id=?');args.push(url.searchParams.get('caseId'));}
      const clause=' WHERE '+where.join(' AND '),limit=20;
      const total=db.prepare('SELECT count(*) AS n FROM adoption_applications a JOIN cases c ON c.id=a.case_id'+clause).get(...args).n;
      const items=db.prepare(select+clause+' ORDER BY a.created DESC,a.id DESC LIMIT ? OFFSET ?').all(...args,limit,raw).map(pack);
      send(200,{items,total,offset:raw,limit});return true;
    }
    if(itemPath) {
      // Leer después del cuerpo evita decidir sobre una solicitud ya modificada.
      const body=req.method==='PATCH'?await json(req):null;
      const row=db.prepare(select+' WHERE a.id=?').get(itemPath[1]);
      if(!row||(row.owner_id!==user.id&&row.applicant_id!==user.id))fail(404,'Solicitud no encontrada.');
      if(req.method==='GET'){send(200,pack(row));return true;}
      if(req.method==='PATCH') {
        const allowed=row.owner_id===user.id?['accepted','rejected']:['withdrawn'];
        if(!allowed.includes(body.state))fail(403,'No puedes realizar esta acción.');
        if(row.state===body.state){send(200,pack(row));return true;}
        if(row.state!=='pending')fail(409,'Esta solicitud ya fue atendida.');
        if(body.state==='accepted'&&(row.caseState!=='available'||hidden(row.case_id)))fail(409,'La publicación debe estar disponible y visible para confirmar la adopción.');
        transaction(()=>{
          const updated=new Date().toISOString();
          db.prepare('UPDATE adoption_applications SET state=?,updated=? WHERE id=?').run(body.state,updated,row.id);
          notify(body.state==='withdrawn'?row.owner_id:row.applicant_id,'adoption_'+body.state,row.id);
          if(body.state==='accepted') {
            db.prepare("UPDATE cases SET state='adopted' WHERE id=?").run(row.case_id);
            const others=db.prepare("SELECT id,applicant_id FROM adoption_applications WHERE case_id=? AND state='pending'").all(row.case_id);
            db.prepare("UPDATE adoption_applications SET state='rejected',updated=? WHERE case_id=? AND state='pending'").run(updated,row.case_id);
            for(const other of others)notify(other.applicant_id,'adoption_rejected',other.id);
          }
        });
        send(200,pack(db.prepare(select+' WHERE a.id=?').get(row.id)));return true;
      }
    }
    fail(405,'Método no permitido.');
  }
  return {route,metadata};
}
