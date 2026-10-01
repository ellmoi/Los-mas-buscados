import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createApp} from '../server.mjs';
import {grantAdmin} from '../scripts/admin.mjs';
import {caseRow,reportRow,auditRow} from '../frontend/js/admin-views.js';

test('Moderación: autorización, privacidad, restauración, auditoría y reinicio',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'buscados-moderation-'));let server,base;
 async function start(){server=createApp({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
 async function stop(){await new Promise(r=>server.close(r));}
 async function call(path,method='GET',body,cookie){return fetch(base+'/api/v1'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});}
 const data=async(path,cookie)=>{const response=await call(path,'GET',null,cookie);assert.equal(response.status,200);return response.json();};
 const register=async email=>{const r=await call('/register','POST',{email,name:email,password:'Test-only-123'});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
 try{
  await start();
  const owner=await register('owner@example.com'),reporter=await register('reporter@example.com'),oldAdmin=await register('admin@example.com');
  for(const path of ['/admin/summary','/admin/cases','/admin/reports','/admin/audit']){assert.equal((await call(path)).status,401);assert.equal((await call(path,'GET',null,owner)).status,403);}
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const created=await call('/cases','POST',{kind:'found',name:'Gata gris',species:'Gato',city:'Bogotá',zone:'Centro',description:'Encontrada cerca al parque',photos:[png]},owner);assert.equal(created.status,201);const pet=await created.json();
  assert.equal(grantAdmin(join(dir,'buscados.sqlite'),'admin@example.com'),true);
  assert.equal(await data('/me',oldAdmin),null);
  const login=await call('/login','POST',{email:'admin@example.com',password:'Test-only-123'});const admin=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await data('/me',admin)).role,'ADMIN');
  assert.equal(grantAdmin(join(dir,'buscados.sqlite'),'admin@example.com'),false);
  const report='/cases/'+pet.id+'/reports',reason='La información parece incorrecta.';
  assert.equal((await call(report,'POST',{reason})).status,401);
  assert.equal((await call(report,'POST',{reason},owner)).status,400);
  assert.equal((await call(report,'POST',{reason:'corto'},reporter)).status,400);
  assert.equal((await call(report,'POST',{reason},reporter)).status,201);
  assert.equal((await call(report,'POST',{reason},reporter)).status,409);
  const pending=await data('/admin/reports',admin);assert.equal(pending.total,1);assert.equal(pending.items[0].reason,reason);
  assert.equal((await data('/cases/'+pet.id)).reporter_id,undefined);
  const moderation='/admin/cases/'+pet.id+'/moderation';
  assert.equal((await call(moderation,'PATCH',{visibility:'hidden',reason},owner)).status,403);
  assert.equal((await call(moderation,'PATCH',{visibility:'hidden',reason:'corto'},admin)).status,400);
  assert.equal((await call(moderation,'PATCH',{visibility:'hidden',reason},admin)).status,200);
  assert.equal((await data('/cases')).total,0);
  assert.equal((await data('/cases?q=gris')).total,0);
  assert.equal((await call('/cases/'+pet.id)).status,404);
  assert.equal((await call('/cases/'+pet.id,'GET',null,reporter)).status,404);
  assert.equal((await fetch(base+pet.image)).status,404);
  const image=await fetch(base+pet.image,{headers:{Cookie:owner}});assert.equal(image.status,200);assert.equal(image.headers.get('cache-control'),'private, no-store');
  assert.equal((await data('/cases?mine=true',owner)).items[0].moderationReason,reason);
  assert.equal((await data('/admin/cases?visibility=hidden',admin)).total,1);
  assert.equal((await data('/admin/reports?status=reviewed',admin)).total,1);
  assert.equal((await data('/admin/summary',admin)).hidden,1);
  assert.equal((await call('/cases/'+pet.id,'PATCH',{description:'Información corregida',visibility:'visible'},owner)).status,200);
  assert.equal((await call('/cases/'+pet.id)).status,404);
  await stop();await start();
  assert.equal((await call('/cases/'+pet.id)).status,404);
  assert.equal((await data('/admin/audit',admin)).total,2);
  assert.equal((await call(moderation,'PATCH',{visibility:'visible',reason:'Información revisada y corregida.'},admin)).status,200);
  assert.equal((await data('/cases')).total,1);assert.equal((await data('/cases/'+pet.id)).moderationReason,undefined);assert.equal((await fetch(base+pet.image)).status,200);
  assert.equal((await call(report,'POST',{reason:'Otro problema para revisar.'},reporter)).status,201);
  const newReport=(await data('/admin/reports',admin)).items[0];
  assert.equal((await call('/admin/reports/'+newReport.id,'PATCH',{status:'dismissed',reason:'La evidencia no respalda el reporte.'},admin)).status,200);
  assert.equal((await call('/admin/reports/'+newReport.id,'PATCH',{status:'reviewed',reason:'Intento de revisión repetida.'},admin)).status,409);
  const audit=await data('/admin/audit',admin);assert.deepEqual(new Set(audit.items.map(x=>x.action)),new Set(['grant_admin','hide_case','restore_case','dismiss_report']));
  assert.equal((await data('/admin/reports?status=dismissed',admin)).total,1);
  assert.equal((await fetch(base+'/admin/',{headers:{Cookie:admin}})).status,200);
  assert.equal((await fetch(base+'/index.html')).status,200);
 }finally{if(server?.listening)await stop();if(resolve(dir).startsWith(resolve(tmpdir())+ '\\')||resolve(dir).startsWith(resolve(tmpdir())+'/'))rmSync(dir,{recursive:true,force:true});}
});

test('El panel escapa nombres, reportes y motivos de moderación',()=>{
 const malicious='<img src=x onerror=alert(1)>';
 for(const html of [caseRow({id:'id',name:malicious,moderationReason:malicious,visibility:'hidden'}),reportRow({id:'id',case_id:'id',caseName:malicious,reason:malicious,status:'pending',created:new Date().toISOString()}),auditRow({created:new Date().toISOString(),actorName:malicious,reason:malicious,action:'hide_case'})]){
  assert.ok(!html.includes(malicious));assert.ok(html.includes('&lt;img'));
 }
});
