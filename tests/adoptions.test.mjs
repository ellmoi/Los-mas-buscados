import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.mjs';
import {grantAdmin} from '../scripts/admin.mjs';
import {applicationDetail,applicationCard,adoptionContact,adoptionActions} from '../frontend/js/pages/adoptions.js';
import {listing} from '../frontend/js/pages/core.js';
import {detail} from '../frontend/js/pages/detail.js';
import {notificationCard} from '../frontend/js/pages/notifications.js';

const petBody={kind:'adoption',name:'Luna',species:'Gato',city:'Bogotá',zone:'Centro',description:'Gata tranquila',age:'2 años',care:'Vacunada; esterilización por confirmar',requirements:'Hogar con ventanas protegidas'};
const message='Tengo experiencia cuidando gatos y puedo atender sus necesidades.';
async function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'buscados-adoptions-'));let server,base;
  const start=async()=>{server=createApp({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/api/v1';};
  const stop=()=>new Promise(r=>server.close(r));
  const call=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const get=async(path,cookie)=>{const r=await call(path,'GET',null,cookie);assert.equal(r.status,200);return r.json();};
  const register=async email=>{const r=await call('/register','POST',{email,name:email,password:'Test-only-123'});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
  t.after(async()=>{if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});});
  await start();return {dir,start,stop,call,get,register};
}

test('Adopciones: publicación, solicitudes privadas, moderación, confirmación atómica y persistencia',async t=>{
  const {dir,start,stop,call,get,register}=await fixture(t);
  const owner=await register('owner@example.com'),a=await register('a@example.com'),b=await register('b@example.com'),c=await register('c@example.com'),outsider=await register('outsider@example.com');
  assert.equal((await call('/cases','POST',petBody)).status,401);
  assert.equal((await call('/cases','POST',{...petBody,care:''},owner)).status,400);
  assert.equal((await call('/cases','POST',{...petBody,requirements:'x'.repeat(501)},owner)).status,400);
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const created=await call('/cases','POST',{...petBody,photos:[png],state:'adopted'},owner);assert.equal(created.status,201);
  const pet=await created.json(),path='/cases/'+pet.id,apply=path+'/adoption-applications';
  assert.equal(pet.state,'available');assert.equal(pet.status,'Disponible para adopción');assert.equal(pet.canManageAdoption,true);
  assert.equal((await get('/cases?kind=adoption')).total,1);assert.equal((await get(path)).myApplication,null);
  assert.equal((await call(path,'PATCH',{state:'adopted'},owner)).status,400);
  assert.equal((await call(path,'PATCH',{description:'Información actualizada'},owner)).status,200);
  assert.equal((await get(path)).care,petBody.care);
  assert.equal((await call(apply,'POST',{message})).status,401);
  assert.equal((await call(apply,'POST',{message},owner)).status,400);
  assert.equal((await call(apply,'POST',{message:'corto'},a)).status,400);
  assert.equal((await call(apply,'POST',{message:'x'.repeat(2001)},a)).status,400);
  const first=await (await call(apply,'POST',{message},a)).json();
  assert.equal((await call(apply,'POST',{message},a)).status,200);
  assert.equal((await call(apply,'POST',{message:message+' distinto'},a)).status,409);
  assert.equal((await get('/notifications',owner)).unread,1);
  assert.equal((await get(path,a)).myApplication.id,first.id);
  assert.equal((await get(path,b)).myApplication,null);
  assert.ok(!JSON.stringify(await get(path)).includes(message));
  assert.equal((await get('/adoption-applications?role=owner',owner)).total,1);
  assert.equal((await get('/adoption-applications',a)).total,1);
  assert.equal((await get('/adoption-applications?role=owner',outsider)).total,0);
  assert.equal((await call('/adoption-applications/'+first.id,'GET',null,outsider)).status,404);
  assert.equal((await call('/adoption-applications/'+first.id,'PATCH',{state:'accepted'},a)).status,403);
  assert.equal((await call(path+'/adoption-state','PATCH',{state:'paused'},a)).status,404);
  assert.equal((await call(path+'/adoption-state','PATCH',{state:'paused'},owner)).status,200);
  assert.equal((await call(apply,'POST',{message},b)).status,409);
  assert.equal((await call('/adoption-applications/'+first.id,'PATCH',{state:'accepted'},owner)).status,409);
  assert.equal((await call(path+'/adoption-state','PATCH',{state:'available'},owner)).status,200);
  const second=await (await call(apply,'POST',{message},b)).json();
  const withdrawn=await (await call(apply,'POST',{message},c)).json();
  assert.equal((await call('/adoption-applications/'+withdrawn.id,'PATCH',{state:'withdrawn'},c)).status,200);
  assert.equal((await call('/adoption-applications/'+withdrawn.id,'PATCH',{state:'accepted'},owner)).status,409);
  assert.equal((await get('/adoption-applications/'+withdrawn.id,c)).state,'withdrawn');
  grantAdmin(join(dir,'buscados.sqlite'),'outsider@example.com');
  const login=await call('/login','POST',{email:'outsider@example.com',password:'Test-only-123'}),admin=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/adoption-applications/'+first.id,'GET',null,admin)).status,404);
  assert.equal((await call('/adoption-applications/'+first.id,'PATCH',{state:'accepted'},admin)).status,404);
  const moderate=visibility=>call('/admin/cases/'+pet.id+'/moderation','PATCH',{visibility,reason:'Revisión de publicación de adopción'},admin);
  assert.equal((await moderate('hidden')).status,200);
  assert.equal((await call(path)).status,404);
  assert.equal((await call('/adoption-applications/'+first.id,'PATCH',{state:'accepted'},owner)).status,409);
  assert.equal((await call(apply,'POST',{message},a)).status,404);
  assert.equal((await get('/adoption-applications/'+first.id,a)).caseHidden,true);
  assert.equal((await moderate('visible')).status,200);
  // Una avería al insertar el aviso debe revertir también la decisión y el caso.
  const db=new DatabaseSync(join(dir,'buscados.sqlite'));
  try{
    db.exec("CREATE TRIGGER fail_adoption_notice BEFORE INSERT ON notifications WHEN NEW.kind='adoption_accepted' BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
    const original=console.error;console.error=()=>{};
    try{assert.equal((await call('/adoption-applications/'+first.id,'PATCH',{state:'accepted'},owner)).status,500);}finally{console.error=original;}
    assert.equal((await get(path)).state,'available');assert.equal((await get('/adoption-applications/'+first.id,a)).state,'pending');
    db.exec('DROP TRIGGER fail_adoption_notice');
  }finally{db.close();}
  const responses=await Promise.all([first,second].map(item=>call('/adoption-applications/'+item.id,'PATCH',{state:'accepted'},owner)));
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const items=(await get('/adoption-applications?role=owner',owner)).items;
  const accepted=items.find(item=>item.state==='accepted');assert.ok(accepted);assert.equal(items.filter(item=>item.state==='accepted').length,1);assert.equal(items.filter(item=>item.state==='rejected').length,1);
  assert.equal((await get(path)).state,'adopted');assert.equal((await get(path)).status,'Adoptado');
  assert.equal((await call(path+'/adoption-state','PATCH',{state:'available'},owner)).status,409);
  const winner=accepted.id===first.id?a:b;
  const notices=await get('/notifications',winner);
  assert.ok(notices.items.some(item=>item.kind==='adoption_accepted'&&item.targetId===accepted.id));
  assert.equal((await call('/adoption-applications/'+accepted.id,'PATCH',{state:'accepted'},owner)).status,200);
  assert.deepEqual(await get('/notifications',winner),notices);
  await stop();await start();
  assert.equal((await get(path)).state,'adopted');assert.equal((await get('/adoption-applications/'+accepted.id,winner)).state,'accepted');
});

test('Adopciones: bandejas paginadas, límites, filtro de caso y rechazo individual',async t=>{
  const {call,get,register}=await fixture(t),owner=await register('owner@example.com'),a=await register('a@example.com'),b=await register('b@example.com'),c=await register('c@example.com');
  const pets=[];for(let i=0;i<11;i++)pets.push(await (await call('/cases','POST',{...petBody,name:'Mascota '+i},owner)).json());
  for(let i=0;i<10;i++)for(const cookie of [a,b])assert.equal((await call('/cases/'+pets[i].id+'/adoption-applications','POST',{message},cookie)).status,201);
  assert.equal((await call('/cases/'+pets[10].id+'/adoption-applications','POST',{message},a)).status,429);
  const last=await (await call('/cases/'+pets[10].id+'/adoption-applications','POST',{message},c)).json();
  const page=await get('/adoption-applications?role=owner',owner),next=await get('/adoption-applications?role=owner&offset=20',owner);
  assert.equal(page.total,21);assert.equal(page.items.length,20);assert.equal(next.items.length,1);assert.ok(!page.items.some(item=>item.id===next.items[0].id));
  assert.equal((await get('/adoption-applications?role=owner&caseId='+pets[0].id,owner)).total,2);
  assert.equal((await call('/adoption-applications?offset=-1','GET',null,a)).status,400);
  assert.equal((await call('/adoption-applications?role=admin','GET',null,a)).status,400);
  assert.equal((await call('/adoption-applications/'+last.id,'PATCH',{state:'rejected'},owner)).status,200);
  assert.equal((await get('/cases/'+pets[10].id)).state,'available');assert.equal((await get('/adoption-applications/'+last.id,c)).state,'rejected');
});

test('Vistas de adopción: acciones según permisos, estados y escape de contenido',async t=>{
  const attack='<script>alert(1)</script>';
  const item={id:'id',caseId:'pet',caseName:attack,applicantName:attack,message:attack,state:'pending',caseState:'available',canManage:true,created:'2026-09-13T00:00:00Z'};
  for(const html of [applicationCard(item),applicationDetail(item)]){assert.ok(!html.includes(attack));assert.ok(html.includes('&lt;script&gt;'));}
  assert.match(applicationDetail(item),/data-application-accept/);
  assert.ok(!applicationDetail({...item,caseHidden:true}).includes('data-application-accept'));
  assert.ok(!applicationDetail({...item,canManage:false,canWithdraw:true}).includes('data-application-accept'));
  assert.match(applicationDetail({...item,canManage:false,canWithdraw:true}),/Retirar mi solicitud/);
  assert.ok(!adoptionContact({state:'paused'}).includes('data-adoption-apply'));
  assert.ok(!adoptionActions({canManageAdoption:false}).includes('data-adoption-state'));
  assert.match(await listing('adoption'),/data-live-cases data-kind="adoption"/);
  assert.match(notificationCard({kind:'adoption_accepted',targetId:'id',created:item.created,read:false,id:1}),/#\/solicitudes-adopcion\/id/);
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  let pet={...petBody,id:'pet',state:'available',canEdit:false,canManageAdoption:false,photos:[],status:'Disponible para adopción'};
  globalThis.fetch=async()=>({ok:true,json:async()=>pet});
  const publicView=await detail('pet');assert.match(publicView,/data-adoption-apply/);assert.ok(!publicView.includes('data-contact-case'));assert.ok(!publicView.includes('data-resolve-case'));
  pet={...pet,canEdit:true,canManageAdoption:true};const ownerView=await detail('pet');assert.match(ownerView,/data-adoption-state/);assert.ok(!ownerView.includes('data-adoption-apply'));assert.match(ownerView,/data-edit-case/);
});
