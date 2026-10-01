import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.mjs';

test('Cuentas, permisos, fotografías, búsqueda y persistencia tras reinicio', async()=>{
 const dir=mkdtempSync(join(tmpdir(),'buscados-test-'));
 let server,base;
 async function start(){server=createApp({dataDir:dir});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;}
 async function stop(){await new Promise(resolve=>server.close(resolve));}
 async function call(path,method='GET',body,cookie){return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});}
 try{
  await start();
  assert.equal((await call('/api/v1/me')).status,200);
  assert.equal((await call('/api/v1/cases','POST',{})).status,401);
  const creds={name:'Ana <script>',email:'ana@example.com',password:'Test-only-123',role:'ADMIN'};
  const reg=await call('/api/v1/register','POST',creds);assert.equal(reg.status,200);const cookie=reg.headers.get('set-cookie').split(';')[0];assert.match(reg.headers.get('set-cookie'),/HttpOnly/);assert.equal((await reg.json()).role,'USER');
  assert.equal((await call('/api/v1/register','POST',creds)).status,409);
  assert.equal((await call('/api/v1/login','POST',{...creds,password:'incorrecta'})).status,401);
  assert.equal((await call('/admin/','GET',null,cookie)).status,403);
  assert.equal((await call('/data/buscados.sqlite')).status,404);
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const body={kind:'lost',name:'Luna <img onerror=alert(1)>',species:'Gato',city:'Bogotá',zone:'Chapinero',description:'Gata gris',photos:[png]};
  assert.equal((await call('/api/v1/cases','POST',{...body,photos:['data:image/png;base64,YWJj']},cookie)).status,400);
  const created=await call('/api/v1/cases','POST',body,cookie);assert.equal(created.status,201);const item=await created.json();assert.equal(item.canEdit,true);
  assert.equal((await call(item.image)).headers.get('content-type'),'image/png');
  const outsider=await call('/api/v1/register','POST',{name:'Otra',email:'otra@example.com',password:'Test-only-456'});const otherCookie=outsider.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/api/v1/cases/'+item.id,'PATCH',{state:'resolved'},otherCookie)).status,403);
  assert.equal((await (await call('/api/v1/cases/'+item.id)).json()).canEdit,false);
  assert.equal((await call('/api/v1/cases/'+item.id,'PATCH',{state:'invalid'},cookie)).status,400);
  assert.equal((await call('/api/v1/cases/'+item.id,'PATCH',{state:'resolved',description:'Ya está en casa'},cookie)).status,200);
  assert.equal((await (await call('/api/v1/cases?q=Chapinero&limit=1')).json()).total,1);
  assert.equal((await (await call('/api/v1/cases?mine=true','GET',null,otherCookie)).json()).total,0);
  const cross=await fetch(base+'/api/v1/logout',{method:'POST',headers:{Origin:'https://example.org',Cookie:cookie}});assert.equal(cross.status,403);
  await stop();await start();
  const persisted=await (await call('/api/v1/cases/'+item.id,'GET',null,cookie)).json();assert.equal(persisted.state,'resolved');assert.equal(persisted.description,'Ya está en casa');assert.equal(persisted.canEdit,true);assert.equal((await call(item.image)).status,200);
  assert.equal((await call('/api/v1/logout','POST',{},cookie)).status,200);
  assert.equal(await (await call('/api/v1/me','GET',null,cookie)).json(),null);
  const login=await call('/api/v1/login','POST',creds);assert.equal(login.status,200);
  assert.equal((await call('/frontend/js/app.js')).status,200);
 }finally{if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});
