// Recuperación: guarda hashes de tokens; al restablecer invalida enlaces y sesiones de la cuenta.
import {randomBytes,createHash,scrypt} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt),hash=value=>createHash('sha256').update(value).digest('hex');
export function installRecovery(db,{publicUrl,enqueue,wake,now=Date.now}){
 db.exec(`CREATE TABLE IF NOT EXISTS password_resets(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS password_resets_user ON password_resets(user_id);
 CREATE TABLE IF NOT EXISTS recovery_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);`);
 const generic={message:'Si el correo está registrado, recibirás instrucciones para recuperar tu cuenta.'};
 const limited=(key,max)=>{
  const time=now();db.prepare('DELETE FROM recovery_limits WHERE until<=?').run(time);
  db.prepare('INSERT INTO recovery_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,time+900000);
  return db.prepare('SELECT count FROM recovery_limits WHERE key=?').get(key).count>max;
 };
 async function route({req,url,json,send,fail}){
  if(!['/api/v1/password/forgot','/api/v1/password/reset'].includes(url.pathname))return false;
  if(req.method!=='POST')fail(405,'Método no permitido.');
  if(limited('ip:'+hash(req.socket.remoteAddress||''),30))fail(429,'Demasiados intentos. Intenta de nuevo en 15 minutos.');
  const body=await json(req);
  if(url.pathname.endsWith('/forgot')){
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Escribe un correo válido.');
   const throttled=limited('email:'+hash(email),3);
   const user=db.prepare('SELECT id FROM users WHERE email=?').get(email);
   db.prepare('DELETE FROM password_resets WHERE expires<=?').run(now());
   if(user&&!throttled){
    const token=randomBytes(32).toString('hex');
    const expires=now()+1800000;
    db.exec('BEGIN');
    try{
     db.prepare('INSERT INTO password_resets VALUES(?,?,?)').run(hash(token),user.id,expires);
     enqueue({to:email,url:publicUrl+'/#/restablecer?token='+token},{tokenHash:hash(token),expires});
     db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
    wake();
   }
   send(202,generic);return true;
  }
  if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))fail(400,'El enlace es inválido o ha vencido.');
  if(typeof body.password!=='string'||body.password.length<8||body.password.length>128)fail(400,'La contraseña debe tener entre 8 y 128 caracteres.');
  const token=hash(body.token);let entry=db.prepare('SELECT * FROM password_resets WHERE token=? AND expires>?').get(token,now());
  if(!entry)fail(400,'El enlace es inválido o ha vencido.');
  const salt=randomBytes(16).toString('hex'),password=salt+':'+(await derive(body.password,salt,64)).toString('hex');
  db.exec('BEGIN');
  try{
   // Recheck after password derivation so concurrent requests cannot reuse a token.
   entry=db.prepare('SELECT * FROM password_resets WHERE token=? AND expires>?').get(token,now());
   if(!entry)fail(400,'El enlace es inválido o ha vencido.');
   db.prepare('UPDATE users SET password=? WHERE id=?').run(password,entry.user_id);
   db.prepare('DELETE FROM sessions WHERE user_id=?').run(entry.user_id);
   db.prepare('DELETE FROM password_resets WHERE user_id=?').run(entry.user_id);
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  send(200,{message:'Contraseña actualizada. Inicia sesión nuevamente.'});return true;
 }
 return {route};
}
