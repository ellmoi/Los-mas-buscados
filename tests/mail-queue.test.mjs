import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {installMailQueue} from '../backend/mail-queue.mjs';
import {createMailer} from '../backend/runtime.mjs';
import {createApp} from '../server.mjs';
import {grantAdmin} from '../scripts/admin.mjs';

test('Cola: reintentos persistentes, clave estable, caducidad, cancelación y límite',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'buscados-queue-'));let db,queue,time=1000000;
  const delivered=[];
  const open=()=>{db=new DatabaseSync(join(dir,'test.sqlite'));db.exec('CREATE TABLE IF NOT EXISTS password_resets(token TEXT PRIMARY KEY,expires INTEGER); CREATE TABLE IF NOT EXISTS email_verifications(token TEXT PRIMARY KEY,expires INTEGER);');};
  const add=(token,kind='recovery')=>{
    const expires=time+86400000;
    db.prepare(`INSERT INTO ${kind==='verification'?'email_verifications':'password_resets'} VALUES(?,?)`).run(token,expires);
    return queue.enqueue({to:'test@example.com',url:'https://example.com/#/?token='+token,kind},{tokenHash:token,expires});
  };
  const row=id=>db.prepare('SELECT * FROM mail_outbox WHERE id=?').get(id);
  try{
    open();queue=installMailQueue(db,{now:()=>time,deliver:async message=>{delivered.push(message);throw Error('Sensitive transport text');}});
    const id=add('one');await queue.kick();
    assert.equal(row(id).status,'pending');assert.equal(row(id).attempts,1);assert.equal(row(id).next_attempt,time+30000);
    assert.equal(row(id).error_code,'transport_error');await queue.kick();assert.equal(delivered.length,1);
    queue.stop();db.close();open();time+=30000;
    queue=installMailQueue(db,{now:()=>time,deliver:async message=>delivered.push(message)});await queue.kick();
    assert.equal(row(id).status,'sent');assert.equal(row(id).payload,null);assert.equal(delivered[0].idempotencyKey,delivered[1].idempotencyKey);
    const expired=add('expired'),cancelled=add('cancelled','verification');
    db.prepare('DELETE FROM email_verifications WHERE token=?').run('cancelled');time+=86400001;
    await queue.kick();assert.equal(row(expired).status,'expired');assert.equal(row(cancelled).status,'expired');assert.equal(delivered.length,2);
    queue.stop();queue=installMailQueue(db,{now:()=>time,deliver:async()=>{throw Object.assign(Error('Unavailable'),{status:503,retryAfterMs:60000});}});
    const failed=add('failure','verification');await queue.kick();assert.equal(row(failed).next_attempt,time+60000);
    for(let i=1;i<8;i++){time=row(failed).next_attempt;await queue.kick();}
    assert.equal(row(failed).attempts,8);assert.equal(row(failed).status,'failed');assert.equal(row(failed).payload,null);
    queue.stop();queue=installMailQueue(db,{now:()=>time,deliver:async()=>{throw Object.assign(Error('Invalid'),{status:422,retryable:false});}});
    const permanent=add('permanent');await queue.kick();assert.equal(row(permanent).attempts,1);assert.equal(row(permanent).status,'failed');
  }finally{queue?.stop();db?.close();rmSync(dir,{recursive:true,force:true});}
});

test('Cola: cierre durante envío, recuperación de sending y exclusión de workers simultáneos',async()=>{
  const db=new DatabaseSync(':memory:');let queue,finish,calls=0;
  db.exec('CREATE TABLE password_resets(token TEXT PRIMARY KEY,expires INTEGER); CREATE TABLE email_verifications(token TEXT PRIMARY KEY,expires INTEGER); INSERT INTO password_resets VALUES(\'token\',999999);');
  try{
    queue=installMailQueue(db,{now:()=>1000,deliver:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}});
    const id=queue.enqueue({to:'test@example.com',url:'https://example.com'},{tokenHash:'token',expires:999999});
    const pending=queue.kick();queue.kick();assert.equal(calls,1);
    queue.stop();finish();await pending;
    assert.equal(db.prepare('SELECT status FROM mail_outbox WHERE id=?').get(id).status,'sending');
    queue=installMailQueue(db,{now:()=>1000,deliver:async message=>{assert.equal(message.idempotencyKey,id);calls++;}});
    await queue.kick();assert.equal(calls,2);assert.equal(db.prepare('SELECT status FROM mail_outbox').get().status,'sent');
  }finally{queue?.stop();db.close();}
});

test('Transportes: archivo local idempotente y errores HTTP con Retry-After',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'buscados-mail-file-')),original=globalThis.fetch;
  t.after(()=>{globalThis.fetch=original;rmSync(dir,{recursive:true,force:true});});
  const message={to:'test@example.com',url:'https://example.com/#/token',idempotencyKey:'stable-id'};
  const local=createMailer({mailMode:'file'},dir);await local(message);await local(message);
  assert.deepEqual(readdirSync(join(dir,'mail')),['stable-id.json']);assert.equal(JSON.parse(readFileSync(join(dir,'mail/stable-id.json'),'utf8')).to,message.to);
  const remote=createMailer({mailMode:'resend',apiKey:'test',from:'test@example.com'},dir);
  let status=429;
  globalThis.fetch=async(_url,options)=>{assert.equal(options.headers['Idempotency-Key'],'stable-id');return {ok:false,status,headers:new Headers({'retry-after':'90'})};};
  await assert.rejects(remote(message),error=>error.retryable&&error.retryAfterMs===90000);
  status=403;await assert.rejects(remote(message),error=>error.retryable===false);
});

test('Cola HTTP: estado privado, alta atómica de token y correo, envío sin esperar proveedor',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'buscados-mail-api-'));let server,finish;
  try{
    server=createApp({dataDir:dir,deliver:()=>new Promise(resolve=>{finish=resolve;})});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port+'/api/v1';
    const call=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const registered=await call('/register','POST',{name:'Editor',email:'editor@example.com',password:'Test-password-123'}),user=registered.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('/admin/mail')).status,401);assert.equal((await call('/admin/mail','GET',null,user)).status,403);
    const response=await call('/email/verification','POST',{},user);assert.equal(response.status,202);
    const db=new DatabaseSync(join(dir,'buscados.sqlite'));
    try{
      assert.equal(db.prepare('SELECT status FROM mail_outbox').get().status,'sending');
      assert.equal(db.prepare('SELECT count(*) AS n FROM email_verifications').get().n,1);
      finish();await new Promise(resolve=>setImmediate(resolve));
      db.exec("CREATE TRIGGER fail_enqueue BEFORE INSERT ON mail_outbox BEGIN SELECT RAISE(ABORT,'test queue rollback'); END;");
      assert.equal((await call('/password/forgot','POST',{email:'editor@example.com'})).status,500);
      assert.equal(db.prepare('SELECT count(*) AS n FROM password_resets').get().n,0);
      assert.equal((await call('/email/verification','POST',{},user)).status,500);
      assert.equal(db.prepare('SELECT count(*) AS n FROM email_verifications').get().n,1);
      db.exec('DROP TRIGGER fail_enqueue');
      grantAdmin(join(dir,'buscados.sqlite'),'editor@example.com');
      const login=await call('/login','POST',{email:'editor@example.com',password:'Test-password-123'}),admin=login.headers.get('set-cookie').split(';')[0];
      const state=await (await call('/admin/mail','GET',null,admin)).json();
      assert.equal(state.items.length,1);assert.equal(state.items[0].status,'sent');
      assert.ok(!JSON.stringify(state).includes('editor@example.com'));assert.ok(!('payload' in state.items[0]));assert.ok(!('token_hash' in state.items[0]));
    }finally{db.close();}
  }finally{finish?.();if(server?.listening)await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
});
