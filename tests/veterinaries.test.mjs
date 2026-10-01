import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.mjs';
import {grantAdmin} from '../scripts/admin.mjs';
import {vetCard} from '../frontend/js/pages/veterinaries.js';
import {vetForm} from '../frontend/js/admin-veterinaries.js';

test('Directorio: revisión, permisos, conflictos, filtros, paginación y persistencia',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'buscados-vets-'));let server,base;
  const start=async()=>{server=createApp({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/api/v1';};
  const stop=()=>new Promise(r=>server.close(r));
  const call=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const get=async(path,cookie)=>{const r=await call(path,'GET',null,cookie);assert.equal(r.status,200);return r.json();};
  const draft={name:'Establecimiento de prueba',city:'Bogotá',address:'Dirección comercial de prueba',phone:'+57 123 456 7890',hours:'Lunes a viernes, 9 a 17',services:'Consulta, vacunación',sourceUrl:'https://example.com/contacto'};
  try{
    await start();const registered=await call('/register','POST',{name:'Prueba',email:'admin@example.com',password:'Test-only-123'}),user=registered.headers.get('set-cookie').split(';')[0];
    assert.equal((await get('/veterinaries')).total,0);
    assert.equal((await call('/admin/veterinaries')).status,401);
    assert.equal((await call('/admin/veterinaries','POST',draft,user)).status,403);
    grantAdmin(join(dir,'buscados.sqlite'),'admin@example.com');
    const login=await call('/login','POST',{email:'admin@example.com',password:'Test-only-123'}),admin=login.headers.get('set-cookie').split(';')[0];
    for(const sourceUrl of ['javascript:alert(1)','http://example.com','https://user:secret@example.com'])assert.equal((await call('/admin/veterinaries','POST',{...draft,sourceUrl},admin)).status,400);
    assert.equal((await call('/admin/veterinaries','POST',{...draft,phone:'incorrecto'},admin)).status,400);
    let vet=await (await call('/admin/veterinaries','POST',{...draft,status:'published'},admin)).json();
    const path='/admin/veterinaries/'+vet.id,publicPath='/veterinaries/'+vet.id;
    assert.equal(vet.status,'draft');assert.equal((await call(publicPath)).status,404);
    const decision={revision:vet.revision,status:'published',verifiedOn:new Date().toISOString().slice(0,10),reason:'Datos comprobados en fuente pública'};
    for(const verifiedOn of ['', '2099-01-01','2026-02-30'])assert.equal((await call(path+'/review','PATCH',{...decision,verifiedOn},admin)).status,400);
    assert.equal((await call(path+'/review','PATCH',{...decision,reason:'corto'},admin)).status,400);
    vet=await (await call(path+'/review','PATCH',decision,admin)).json();assert.equal(vet.status,'published');
    assert.equal((await get(publicPath)).verifiedOn,decision.verifiedOn);
    assert.equal((await get('/veterinaries?city=Bogot&service=vacun')).total,1);
    assert.equal((await get('/veterinaries?city=Cali')).total,0);
    assert.equal((await call(path,'PATCH',{revision:1,name:'Obsoleto',reason:'Edición con versión obsoleta'},admin)).status,409);
    vet=await (await call(path,'PATCH',{revision:vet.revision,name:'Nombre corregido',reason:'Se corrigió el nombre de la ficha'},admin)).json();
    assert.equal(vet.status,'draft');assert.equal(vet.verifiedOn,null);assert.equal((await call(publicPath)).status,404);
    const reviews=await Promise.all(['published','hidden'].map(status=>call(path+'/review','PATCH',{...decision,revision:vet.revision,status},admin)));
    assert.deepEqual(reviews.map(r=>r.status).sort(),[200,409]);
    vet=await get(path,admin);
    vet=await (await call(path+'/review','PATCH',{...decision,revision:vet.revision,status:'hidden'},admin)).json();
    assert.equal((await get('/veterinaries')).total,0);
    assert.equal((await get('/admin/veterinaries?status=hidden',admin)).total,1);
    vet=await (await call(path+'/review','PATCH',{...decision,revision:vet.revision},admin)).json();
    for(let i=0;i<20;i++){
      const next=await (await call('/admin/veterinaries','POST',{...draft,name:'Prueba '+i},admin)).json();
      assert.equal((await call('/admin/veterinaries/'+next.id+'/review','PATCH',{...decision,revision:next.revision},admin)).status,200);
    }
    const page=await get('/veterinaries'),next=await get('/veterinaries?offset=20');assert.equal(page.items.length,20);assert.equal(next.items.length,1);assert.equal(page.total,21);assert.ok(!page.items.some(item=>item.id===next.items[0].id));
    assert.equal((await call('/veterinaries?offset=-1')).status,400);
    const audit=await get('/admin/audit',admin);assert.ok(audit.items.some(item=>item.action==='publish_vet'));assert.ok(audit.total>=46);
    await stop();await start();assert.deepEqual(await get(publicPath),vet);assert.equal((await get('/veterinaries')).total,21);
  }finally{if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});

test('Directorio: las vistas escapan campos y no presentan la revisión como acreditación',()=>{
  const text='<script>alert(1)</script>',vet={name:text,city:text,address:text,phone:text,hours:text,services:text,sourceUrl:'https://example.com/?q="',verifiedOn:'2026-09-13'};
  for(const html of [vetCard(vet),vetForm(vet)]){assert.ok(!html.includes(text));assert.ok(html.includes('&lt;script&gt;'));}
  assert.match(vetCard(vet),/Consultar fuente/);assert.match(vetForm(),/Guardar borrador/);
});
