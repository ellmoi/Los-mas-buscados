import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server.mjs';
import {grantAdmin} from '../scripts/admin.mjs';
import {conversationCard,messageBubble} from '../frontend/js/pages/messages.js';

test('Conversaciones: privacidad, lectura, duplicados, cierre, paginación y persistencia',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'buscados-messages-'));let server,base;
 const start=async()=>{server=createApp({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/api/v1';};
 const stop=()=>new Promise(r=>server.close(r));
 const call=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const get=async(path,cookie)=>{const r=await call(path,'GET',null,cookie);assert.equal(r.status,200);return r.json();};
 const register=async email=>{const r=await call('/register','POST',{email,name:email,password:'Test-only-123'});return r.headers.get('set-cookie').split(';')[0];};
 const msg=text=>({text,clientId:randomUUID()});
 try{
  await start();const owner=await register('owner@example.com'),visitor=await register('visitor@example.com'),outsider=await register('outsider@example.com');
  const response=await call('/cases','POST',{kind:'lost',name:'Luna',species:'Gato',city:'Bogotá',zone:'Centro',description:'Gata perdida'},owner);const pet=await response.json();
  const path='/cases/'+pet.id+'/conversations',first=msg('Tengo información sobre Luna');
  assert.equal((await call(path,'POST',first)).status,401);
  assert.equal((await call(path,'POST',first,owner)).status,400);
  assert.equal((await call(path,'POST',msg('  '),visitor)).status,400);
  assert.equal((await call(path,'POST',{...first,text:'x'.repeat(2001)},visitor)).status,400);
  const created=await call(path,'POST',first,visitor);assert.equal(created.status,201);const {id}=await created.json(),thread='/conversations/'+id;
  assert.equal((await call(path,'POST',first,visitor)).status,200);
  assert.equal((await get('/conversations',owner)).items[0].unread,1);
  assert.equal((await get('/conversations',outsider)).total,0);
  for(const [method,suffix,body]of [['GET','',null],['POST','/messages',msg('Intrusión')],['POST','/read',{lastId:1}],['PATCH','',{closed:true}]])assert.equal((await call(thread+suffix,method,body,outsider)).status,404);
  const initial=await get(thread,owner);assert.equal(initial.items.length,1);assert.equal(initial.items[0].mine,false);assert.equal(initial.items[0].sender_id,undefined);assert.equal(initial.peerName,'visitor@example.com');
  assert.equal((await call(thread+'/read','POST',{lastId:999999},owner)).status,400);
  assert.equal((await call(thread+'/read','POST',{lastId:initial.items[0].id},owner)).status,200);
  assert.equal((await get('/conversations',owner)).items[0].unread,0);
  const reply=msg('Gracias, ¿en qué zona la viste?');
  assert.equal((await call(thread+'/messages','POST',reply,owner)).status,201);
  assert.equal((await call(thread+'/messages','POST',reply,owner)).status,200);
  assert.equal((await call(thread+'/messages','POST',{...reply,text:'Otro texto'},owner)).status,409);
  assert.equal((await get('/conversations',visitor)).items[0].unread,1);
  assert.equal((await call(thread,'PATCH',{closed:true},owner)).status,200);
  assert.equal((await call(thread+'/messages','POST',msg('Mensaje bloqueado'),visitor)).status,409);
  assert.equal((await call(thread,'PATCH',{closed:false},visitor)).status,200);
  assert.equal((await get(thread,visitor)).closedByOther,true);
  assert.equal((await call(path,'POST',msg('No crear una nueva'),visitor)).status,409);
  assert.equal((await call(thread,'PATCH',{closed:false},owner)).status,200);
  for(let i=0;i<44;i++)assert.equal((await call(thread+'/messages','POST',msg('Mensaje '+i),i%2?owner:visitor)).status,201);
  const recent=await get(thread,visitor);assert.equal(recent.items.length,40);assert.equal(recent.hasMore,true);
  const older=await get(thread+'?before='+recent.nextBefore,visitor);assert.equal(older.items.length,6);assert.equal(older.hasMore,false);assert.ok(older.items.at(-1).id<recent.items[0].id);
  const last=recent.items.at(-1).id;await call(thread+'/read','POST',{lastId:last},visitor);await call(thread+'/read','POST',{lastId:older.items[0].id},visitor);assert.equal((await get('/conversations',visitor)).items[0].unread,0);
  grantAdmin(join(dir,'buscados.sqlite'),'outsider@example.com');const login=await call('/login','POST',{email:'outsider@example.com',password:'Test-only-123'});const admin=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await call(thread,'GET',null,admin)).status,404);
  assert.equal((await call('/admin/cases/'+pet.id+'/moderation','PATCH',{visibility:'hidden',reason:'Revisión de información pendiente'},admin)).status,200);
  assert.equal((await call(thread+'/messages','POST',msg('Caso oculto'),owner)).status,409);
  assert.equal((await call(path,'POST',msg('Caso oculto'),visitor)).status,404);
  assert.equal((await get(thread,owner)).caseHidden,true);
  await stop();await start();assert.equal((await get(thread,visitor)).items.length,40);assert.equal((await get('/conversations',visitor)).items[0].unread,0);
 }finally{if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});

test('Las vistas de mensajes escapan contenido y nombres',()=>{
 const text='<img src=x onerror=alert(1)>';
 for(const html of [messageBubble({text,mine:false,created:new Date().toISOString()}),conversationCard({id:'id',caseName:text,peerName:text,unread:2})]){assert.ok(!html.includes(text));assert.ok(html.includes('&lt;img'));}
});
