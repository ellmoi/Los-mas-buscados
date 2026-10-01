import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {installModeration} from '../backend/moderation.mjs';
import {runtimeConfig} from '../backend/runtime.mjs';

// Local operator tool: never exposed through HTTP. Existing credentials are retained.
export function grantAdmin(database,email){
 if(!existsSync(database))throw new Error('Primero inicia la aplicación y registra tu cuenta.');
 const db=new DatabaseSync(database);
 try{
  installModeration(db);
  const user=db.prepare('SELECT id,role FROM users WHERE email=?').get(email.trim().toLowerCase());
  if(!user)throw new Error('Primero registra esa cuenta en la aplicación.');
  if(user.role==='ADMIN')return false;
  db.exec('BEGIN');
  try{
   db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(user.id);
   db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
   db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(randomUUID(),user.id,'grant_admin',user.id,'Asignación por operador local mediante scripts/admin.mjs',new Date().toISOString());
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return true;
 }finally{db.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const email=process.argv[2];
 if(!email){console.error('Uso: node scripts/admin.mjs correo@ejemplo.com');process.exitCode=1;}
 else try{const database=resolve(runtimeConfig().dataDir,'buscados.sqlite');console.log(grantAdmin(database,email)?'Administrador habilitado. Inicia sesión nuevamente.':'La cuenta ya es administradora.');}catch(error){console.error(error.message);process.exitCode=1;}
}
