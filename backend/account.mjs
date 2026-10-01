// Cuenta: nombre editable y verificación del correo; no permite cambiar rol ni correo mediante PATCH.
import {randomBytes,createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');

export function installAccount(db,{publicUrl,enqueue,wake,now=Date.now}){
 db.exec(`CREATE TABLE IF NOT EXISTS verified_emails(user_id TEXT PRIMARY KEY REFERENCES users(id),email TEXT NOT NULL,verified_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS email_verifications(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),email TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS email_verifications_user ON email_verifications(user_id);
 CREATE TABLE IF NOT EXISTS verification_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);`);
 const emailVerified=user=>!!db.prepare('SELECT 1 FROM verified_emails WHERE user_id=? AND email=?').get(user.id,user.email);
 const limited=(key,max)=>{
  db.prepare('DELETE FROM verification_limits WHERE until<=?').run(now());
  db.prepare('INSERT INTO verification_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now()+900000);
  return db.prepare('SELECT count FROM verification_limits WHERE key=?').get(key).count>max;
 };
 async function route({req,url,json,send,fail,requireUser,publicUser}){
  const path=url.pathname;
  if(path==='/api/v1/me'&&req.method==='PATCH'){
   const user=requireUser(req),body=await json(req);
   if(Object.keys(body).some(key=>key!=='name')||typeof body.name!=='string'||!body.name.trim()||body.name.length>80)fail(400,'Solo puedes editar el nombre, entre 1 y 80 caracteres.');
   db.prepare('UPDATE users SET name=? WHERE id=?').run(body.name.trim(),user.id);
   send(200,publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(user.id)));return true;
  }
  if(!['/api/v1/email/verification','/api/v1/email/verify'].includes(path))return false;
  if(req.method!=='POST')fail(405,'Método no permitido.');
  if(limited('ip:'+hash(req.socket.remoteAddress||''),30))fail(429,'Demasiados intentos. Espera 15 minutos.');
  if(path.endsWith('/verification')){
   const user=requireUser(req);await json(req);
   if(emailVerified(user)){send(200,{message:'Tu correo ya está verificado.'});return true;}
   if(limited('user:'+user.id,3))fail(429,'Puedes solicitar tres enlaces cada 15 minutos.');
   db.prepare('DELETE FROM email_verifications WHERE expires<=?').run(now());
   const token=randomBytes(32).toString('hex');
   const expires=now()+86400000;
   db.exec('BEGIN');
   try{
    db.prepare('INSERT INTO email_verifications VALUES(?,?,?,?)').run(hash(token),user.id,user.email,expires);
    enqueue({to:user.email,kind:'verification',url:publicUrl+'/#/verificar-correo?token='+token},{tokenHash:hash(token),expires});
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   wake();
   send(202,{message:'Solicitud registrada. Revisa tu correo para confirmar la dirección.'});return true;
  }
  const body=await json(req);
  if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))fail(400,'El enlace es inválido, ya fue utilizado o ha vencido.');
  db.exec('BEGIN');
  try{
   const entry=db.prepare('SELECT v.* FROM email_verifications v JOIN users u ON u.id=v.user_id AND u.email=v.email WHERE token=? AND expires>?').get(hash(body.token),now());
   if(!entry)fail(400,'El enlace es inválido, ya fue utilizado o ha vencido.');
   db.prepare('INSERT INTO verified_emails VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at').run(entry.user_id,entry.email,now());
   db.prepare('DELETE FROM email_verifications WHERE user_id=?').run(entry.user_id);
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  send(200,{message:'El correo del enlace fue verificado correctamente.'});return true;
 }
 return {route,emailVerified};
}
