import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server.mjs';
import {grantAdmin} from '../scripts/admin.mjs';
import {notificationCard} from '../frontend/js/pages/notifications.js';

test('Notificaciones: privacidad, eventos únicos, cursor, lectura y reinicio',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'buscados-notifications-'));let server,base;
  const start=async()=>{server=createApp({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/api/v1';};
  const stop=()=>new Promise(r=>server.close(r));
  const call=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const get=async(cookie,suffix='')=>{const response=await call('/notifications'+suffix,'GET',null,cookie);assert.equal(response.status,200);return response.json();};
  const register=async email=>{const r=await call('/register','POST',{email,name:'Prueba',password:'Test-only-123'});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
  try{
    await start();
    const owner=await register('owner@example.com'),visitor=await register('visitor@example.com'),other=await register('other@example.com');
    assert.equal((await call('/notifications')).status,401);
    assert.equal((await get(owner)).items.length,0);
    const pet=await (await call('/cases','POST',{kind:'lost',name:'Luna',species:'Gato',city:'Bogotá',zone:'Centro',description:'Gata perdida'},owner)).json();
    const first={text:'Información privada',clientId:randomUUID()},path='/cases/'+pet.id+'/conversations';
    const thread=await (await call(path,'POST',first,visitor)).json();
    assert.equal((await call(path,'POST',first,visitor)).status,200);
    let result=await get(owner);
    assert.equal(result.unread,1);assert.equal(result.items[0].kind,'message');assert.equal(result.items[0].targetId,thread.id);
    assert.ok(!JSON.stringify(result).includes(first.text));assert.equal((await get(visitor)).items.length,0);
    const notificationId=result.items[0].id;
    assert.equal((await call('/notifications/'+notificationId+'/read','POST',null,other)).status,404);
    assert.equal((await call('/notifications/read','POST',{throughId:notificationId},other)).status,200);
    assert.equal((await get(owner)).unread,1);
    assert.equal((await call('/notifications/'+notificationId+'/read','POST',null,owner)).status,200);
    assert.equal((await call('/notifications/'+notificationId+'/read','POST',null,owner)).status,200);
    assert.equal((await get(owner)).unread,0);
    for(let i=0;i<26;i++)assert.equal((await call('/conversations/'+thread.id+'/messages','POST',{text:'Mensaje '+i,clientId:randomUUID()},visitor)).status,201);
    result=await get(owner);assert.equal(result.items.length,25);assert.equal(result.hasMore,true);assert.equal(result.unread,26);
    const boundary=result.items[0].id;
    const older=await get(owner,'?before='+result.nextBefore);assert.equal(older.items.length,2);assert.equal(older.hasMore,false);
    assert.ok(older.items.every(item=>item.id<result.nextBefore));
    assert.equal((await call('/conversations/'+thread.id+'/messages','POST',{text:'Nuevo durante lectura',clientId:randomUUID()},visitor)).status,201);
    assert.equal((await call('/notifications/read','POST',{throughId:boundary},owner)).status,200);
    assert.equal((await get(owner)).unread,1);
    assert.equal((await call('/notifications/read','POST',{throughId:-1},owner)).status,400);
    assert.equal((await call('/notifications?before=abc','GET',null,owner)).status,400);
    grantAdmin(join(dir,'buscados.sqlite'),'other@example.com');
    const login=await call('/login','POST',{email:'other@example.com',password:'Test-only-123'}),admin=login.headers.get('set-cookie').split(';')[0];
    const moderate=visibility=>call('/admin/cases/'+pet.id+'/moderation','PATCH',{visibility,reason:'Revisión del caso de prueba'},admin);
    assert.equal((await moderate('hidden')).status,200);
    assert.equal((await moderate('hidden')).status,200);
    result=await get(owner);assert.equal(result.unread,2);assert.equal(result.items[0].kind,'case_hidden');
    assert.equal((await moderate('visible')).status,200);
    result=await get(owner);assert.equal(result.unread,3);assert.equal(result.items[0].kind,'case_restored');assert.equal(result.items[0].targetId,pet.id);
    assert.equal((await get(admin)).items.length,0);assert.equal((await get(visitor)).items.length,0);
    await stop();await start();
    assert.deepEqual(await get(owner),result);
  }finally{if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});

test('Las tarjetas de avisos codifican destinos y muestran el estado de lectura',()=>{
  const item={id:1,kind:'message',targetId:'"><script>alert(1)</script>',created:'2026-09-13T12:00:00Z',read:false};
  const html=notificationCard(item);
  assert.ok(!html.includes('<script>'));assert.match(html,/Sin leer/);assert.match(html,/data-notification-read="1"/);
  assert.ok(!notificationCard({...item,read:true}).includes('data-notification-read'));
});
