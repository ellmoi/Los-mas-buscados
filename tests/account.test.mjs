import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.mjs';
import {createMailer} from '../backend/runtime.mjs';

test('Cuenta: edición autorizada, verificación aislada, caducidad, límites y persistencia',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'buscados-account-')),mail=[];let server,base,time=Date.now();
 const start=async()=>{server=createApp({dataDir:dir,now:()=>time,deliver:async m=>mail.push(m)});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/api/v1';};
 const stop=()=>new Promise(r=>server.close(r));
 const call=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const register=async email=>{const r=await call('/register','POST',{name:'Ana',email,password:'Test-password-123'});assert.equal(r.status,200);assert.equal((await r.json()).emailVerified,false);return r.headers.get('set-cookie').split(';')[0];};
 const me=async cookie=>(await call('/me','GET',null,cookie)).json();
 const token=m=>new URLSearchParams(new URL(m.url).hash.split('?')[1]).get('token');
 try{
  await start();const a=await register('ana@example.com'),b=await register('otra@example.com');
  assert.equal((await call('/me','PATCH',{name:'Otro nombre'})).status,401);
  for(const body of [{name:' '},{name:'x'.repeat(81)},{name:'Ana',role:'ADMIN'},{name:'Ana',email:'otra@example.com'},{name:'Ana',emailVerified:true}])assert.equal((await call('/me','PATCH',body,a)).status,400);
  assert.equal((await call('/me','PATCH',{name:'  Ana <img src=x>  '},a)).status,200);assert.equal((await me(a)).name,'Ana <img src=x>');assert.equal((await me(b)).name,'Ana');
  assert.equal((await call('/email/verification','POST',{})).status,401);
  assert.equal((await call('/email/verification','POST',{email:'otra@example.com'},a)).status,202);assert.equal(mail.at(-1).to,'ana@example.com');assert.equal(mail.at(-1).kind,'verification');
  const first=token(mail.at(-1));const db=new DatabaseSync(join(dir,'buscados.sqlite'));try{assert.notEqual(db.prepare('SELECT token FROM email_verifications').get().token,first);}finally{db.close();}
  assert.equal((await call('/password/reset','POST',{token:first,password:'New-password-456'})).status,400);
  await call('/password/forgot','POST',{email:'ana@example.com'});assert.equal((await call('/email/verify','POST',{token:token(mail.at(-1))})).status,400);
  time+=86400001;assert.equal((await call('/email/verify','POST',{token:first})).status,400);assert.equal((await me(a)).emailVerified,false);
  await call('/email/verification','POST',{},a);const valid=token(mail.at(-1));await call('/email/verification','POST',{},a);const sibling=token(mail.at(-1));
  const responses=await Promise.all([call('/email/verify','POST',{token:valid}),call('/email/verify','POST',{token:valid})]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);
  assert.equal((await call('/email/verify','POST',{token:sibling})).status,400);assert.equal((await me(a)).emailVerified,true);assert.equal((await me(a)).role,'USER');assert.equal((await me(b)).emailVerified,false);
  const before=mail.length;assert.equal((await call('/email/verification','POST',{},a)).status,200);assert.equal(mail.length,before);
  for(let i=0;i<3;i++)assert.equal((await call('/email/verification','POST',{},b)).status,202);
  assert.equal((await call('/email/verification','POST',{},b)).status,429);const pending=token(mail.at(-1));
  await stop();await start();assert.equal((await me(a)).emailVerified,true);assert.equal((await me(a)).name,'Ana <img src=x>');assert.equal((await call('/email/verify','POST',{token:pending})).status,200);assert.equal((await me(b)).emailVerified,true);
  await createMailer({mailMode:'file'},dir)({to:'ana@example.com',kind:'verification',url:'http://localhost/#/verificar-correo?token=test'});
  const message=JSON.parse(readFileSync(join(dir,'mail',readdirSync(join(dir,'mail'))[0]),'utf8'));assert.equal(message.subject,'Verifica tu correo en Buscados');assert.match(message.text,/24 horas/);assert.ok(!message.text.includes('contraseña'));
 }finally{if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});
