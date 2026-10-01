import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.mjs';
import {grantAdmin} from '../scripts/admin.mjs';
import {editorialBody,editorialCard,editorialDetail} from '../frontend/js/pages/editorial.js';
import {editorialForm} from '../frontend/js/admin-editorial.js';

test('CMS: permisos, revisión, conflictos, filtros, auditoría atómica y persistencia',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'buscados-editorial-'));let server,base;
  const database=join(dir,'buscados.sqlite');
  const start=async()=>{server=createApp({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/api/v1';};
  const stop=()=>new Promise(r=>server.close(r));
  const call=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const get=async(path,cookie)=>{const r=await call(path,'GET',null,cookie);assert.equal(r.status,200);return r.json();};
  const draft={kind:'article',title:'Contenido de prueba',summary:'Resumen de prueba',text:'Texto de prueba\nSegundo párrafo.',sourceUrl:'https://example.com/fuente'};
  try{
    await start();
    const registered=await call('/register','POST',{name:'Editor',email:'editor@example.com',password:'Test-only-123'});
    const user=registered.headers.get('set-cookie').split(';')[0];
    assert.equal((await get('/editorial')).total,0);
    assert.equal((await call('/admin/editorial')).status,401);
    assert.equal((await call('/admin/editorial','POST',draft,user)).status,403);
    grantAdmin(database,'editor@example.com');
    const login=await call('/login','POST',{email:'editor@example.com',password:'Test-only-123'});
    const admin=login.headers.get('set-cookie').split(';')[0];
    const ordinary=await call('/register','POST',{name:'Lector',email:'reader@example.com',password:'Test-only-123'});
    const reader=ordinary.headers.get('set-cookie').split(';')[0];
    for(const sourceUrl of ['javascript:alert(1)','http://example.com','https://u:p@example.com'])assert.equal((await call('/admin/editorial','POST',{...draft,sourceUrl},admin)).status,400);
    for(const change of [{kind:'case'},{title:' '},{summary:'a'.repeat(501)},{text:'a'.repeat(20001)}])assert.equal((await call('/admin/editorial','POST',{...draft,...change},admin)).status,400);
    let response=await call('/admin/editorial','POST',{...draft,status:'published',revision:99},admin);assert.equal(response.status,201);
    let item=await response.json();const path='/admin/editorial/'+item.id,pub='/editorial/'+item.id;
    assert.equal(item.status,'draft');assert.equal(item.revision,1);
    assert.equal((await call(pub)).status,404);
    assert.equal((await call(pub,'GET',null,admin)).status,404);
    assert.equal((await call(path,'GET',null,reader)).status,403);
    const decision={revision:1,status:'published',reviewedOn:new Date().toISOString().slice(0,10),reason:'Revisión del contenido y su fuente'};
    for(const reviewedOn of ['', '2099-01-01','2026-02-30'])assert.equal((await call(path+'/review','PATCH',{...decision,reviewedOn},admin)).status,400);
    assert.equal((await call(path+'/review','PATCH',{...decision,reason:'breve'},admin)).status,400);
    assert.equal((await call(path+'/review','PATCH',decision,reader)).status,403);
    item=await (await call(path+'/review','PATCH',decision,admin)).json();
    assert.deepEqual(await get(pub),item);
    assert.equal((await call(pub,'PATCH',{title:'Ataque'},reader)).status,405);
    assert.equal((await call(pub+'/review')).status,404);
    assert.equal((await call(path,'PATCH',{revision:1,title:'Obsoleto',reason:decision.reason},admin)).status,409);
    item=await (await call(path,'PATCH',{revision:item.revision,title:'Título corregido',reason:decision.reason},admin)).json();
    assert.equal(item.status,'draft');assert.equal(item.reviewedOn,null);assert.equal((await call(pub)).status,404);
    const concurrent=await Promise.all(['published','hidden'].map(status=>call(path+'/review','PATCH',{...decision,revision:item.revision,status},admin)));
    assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
    item=await get(path,admin);
    item=await (await call(path+'/review','PATCH',{...decision,revision:item.revision,status:'hidden'},admin)).json();
    assert.equal((await get('/editorial')).total,0);
    assert.equal((await get('/admin/editorial?status=hidden',admin)).total,1);
    // Fallar la auditoría debe revertir tanto la edición como la publicación.
    const db=new DatabaseSync(database);
    try{
      db.exec("CREATE TRIGGER fail_editorial_audit BEFORE INSERT ON audit WHEN NEW.action IN ('publish_editorial','edit_editorial') BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
      for(const [suffix,body] of [['/review',{...decision,revision:item.revision}],['',{revision:item.revision,title:'No debe guardarse',reason:decision.reason}]]){
        assert.equal((await call(path+suffix,'PATCH',body,admin)).status,500);
        assert.deepEqual(await get(path,admin),item);
      }
      db.exec('DROP TRIGGER fail_editorial_audit');
    }finally{db.close();}
    item=await (await call(path+'/review','PATCH',{...decision,revision:item.revision},admin)).json();
    for(let i=0;i<21;i++){
      const next=await (await call('/admin/editorial','POST',{...draft,kind:i===20?'project':'article',title:'Entrada '+i},admin)).json();
      assert.equal((await call('/admin/editorial/'+next.id+'/review','PATCH',decision,admin)).status,200);
    }
    const page=await get('/editorial?kind=article'),next=await get('/editorial?kind=article&offset=20');
    assert.equal(page.total,21);assert.equal(page.items.length,20);assert.equal(next.items.length,1);
    assert.ok(!page.items.some(row=>row.id===next.items[0].id));
    assert.equal((await get('/editorial?kind=project')).total,1);
    assert.equal((await get('/editorial?q=corregido')).total,1);
    assert.equal((await get('/editorial?q=%25')).total,0);
    for(const query of ['offset=-1','offset=1.5','kind=invalid'])assert.equal((await call('/editorial?'+query)).status,400);
    const audit=await get('/admin/audit',admin);assert.ok(audit.items.some(row=>row.action==='publish_editorial'));
    await stop();await start();assert.deepEqual(await get(pub),item);assert.equal((await get('/editorial')).total,22);
  }finally{if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});

test('CMS: texto escapado, enlaces de sección y detalle no publicado',async t=>{
  const attack='<script>alert(1)</script>',item={id:'id',kind:'article',title:attack,summary:attack,text:attack,sourceUrl:'https://example.com/?q="',reviewedOn:'2026-09-14'};
  for(const html of [editorialBody(item),editorialCard(item),editorialForm(item)]){assert.ok(!html.includes(attack));assert.match(html,/&lt;script&gt;/);}
  assert.match(editorialCard(item),/#\/informacion\/especie\/id/);
  assert.match(editorialCard({...item,kind:'project'}),/#\/nuestro-trabajo\/id/);
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch=async()=>({ok:false,status:404,json:async()=>({error:'No existe'})});
  assert.match(await editorialDetail('missing','article'),/Contenido no disponible/);
  globalThis.fetch=async()=>({ok:true,json:async()=>item});
  assert.match(await editorialDetail('id','project'),/Contenido no disponible/);
  assert.match(await editorialDetail('id','article'),/&lt;script&gt;/);
});
