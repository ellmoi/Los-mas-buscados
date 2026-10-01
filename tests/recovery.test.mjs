import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,copyFileSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.mjs';
import {DatabaseSync} from 'node:sqlite';
import {runtimeConfig,createMailer} from '../backend/runtime.mjs';
import {backupDatabase} from '../scripts/backup.mjs';

test('Recuperación: tokens privados, caducidad, uso único, sesiones y respaldo restaurable',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'buscados-recovery-')),mail=[];let time=Date.now(),server,base;
 const start=async(dataDir=dir)=>{server=createApp({dataDir,now:()=>time,deliver:async message=>mail.push(message)});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;};
 const stop=()=>new Promise(r=>server.close(r));
 const call=(path,body,cookie)=>fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const token=()=>new URLSearchParams(new URL(mail.at(-1).url).hash.split('?')[1]).get('token');
 try{
  await start();const account={name:'Ana',email:'ana@example.com',password:'Previous-password-123'};
  const registered=await call('/api/v1/register',account),cookie=registered.headers.get('set-cookie').split(';')[0];
  const unknown=await call('/api/v1/password/forgot',{email:'nobody@example.com'}),known=await call('/api/v1/password/forgot',{email:account.email});
  assert.equal(unknown.status,202);assert.equal(known.status,202);assert.deepEqual(await unknown.json(),await known.json());assert.equal(mail.length,1);
  const first=token();assert.match(first,/^[a-f0-9]{64}$/);
  const db=new DatabaseSync(join(dir,'buscados.sqlite'));try{assert.notEqual(db.prepare('SELECT token FROM password_resets').get().token,first);}finally{db.close();}
  assert.equal((await call('/data/mail')).status,404);assert.equal((await call('/.env')).status,404);
  const newPassword='New-password-456';
  assert.equal((await call('/api/v1/password/reset',{token:first,password:'short'})).status,400);
  const races=await Promise.all([call('/api/v1/password/reset',{token:first,password:newPassword}),call('/api/v1/password/reset',{token:first,password:newPassword})]);assert.deepEqual(races.map(x=>x.status).sort(),[200,400]);
  assert.equal(await (await call('/api/v1/me',null,cookie)).json(),null);
  assert.equal((await call('/api/v1/login',account)).status,401);
  assert.equal((await call('/api/v1/login',{...account,password:newPassword})).status,200);
  await call('/api/v1/password/forgot',{email:account.email});const expired=token();
  time+=1800001;assert.equal((await call('/api/v1/password/reset',{token:expired,password:newPassword})).status,400);
  await call('/api/v1/password/forgot',{email:account.email});const persistent=token();
  await stop();await start();assert.equal((await call('/api/v1/password/reset',{token:persistent,password:'Final-password-789'})).status,200);
  const snapshot=await backupDatabase(join(dir,'buscados.sqlite'),join(dir,'backups'));
  const copy=new DatabaseSync(snapshot,{readOnly:true});try{assert.equal(copy.prepare('SELECT count(*) AS n FROM users').get().n,1);assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');}finally{copy.close();}
  assert.deepEqual(await (await call('/api/v1/health')).json(),{ok:true});
  for(let i=0;i<4;i++)await call('/api/v1/password/forgot',{email:account.email});assert.equal(mail.length,5);
  await stop();const restored=join(dir,'restored');mkdirSync(restored);copyFileSync(snapshot,join(restored,'buscados.sqlite'));await start(restored);
  assert.equal((await call('/api/v1/login',{...account,password:'Final-password-789'})).status,200);
  await createMailer({mailMode:'file'},dir)({to:'test@example.com',url:'http://localhost/#/restablecer?token=test'});
  const local=JSON.parse(readFileSync(join(dir,'mail',readdirSync(join(dir,'mail'))[0]),'utf8'));assert.equal(local.to,'test@example.com');assert.match(local.text,/restablecer/);
 }finally{if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});

test('Configuración de producción rechaza correo local y orígenes inseguros',()=>{
 assert.throws(()=>runtimeConfig({NODE_ENV:'production'}));
 assert.throws(()=>runtimeConfig({PUBLIC_URL:'https://example.com/otro'}));
 assert.throws(()=>runtimeConfig({MAIL_MODE:'resend'}));
 const config=runtimeConfig({NODE_ENV:'production',COOKIE_SECURE:'true',PUBLIC_URL:'https://example.com',MAIL_MODE:'resend',MAIL_FROM:'cuentas@example.com',RESEND_API_KEY:'test-only'});
 assert.equal(config.publicUrl,'https://example.com');assert.equal(config.secure,true);
});
