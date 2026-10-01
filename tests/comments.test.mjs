import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.mjs';
import {grantAdmin} from '../scripts/admin.mjs';
import {commentCard,commentsSection} from '../frontend/js/pages/comments.js';
import {moderationComment} from '../frontend/js/admin-comments.js';

test('Comentarios: permisos, reintentos, revisión, retirada, caso oculto, paginación y persistencia',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'buscados-comments-'));let server,base,db;
  const start=async()=>{server=createApp({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/api/v1';};
  const stop=()=>new Promise(r=>server.close(r));
  const call=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const get=async(path,cookie)=>{const r=await call(path,'GET',null,cookie);assert.equal(r.status,200);return r.json();};
  const register=async email=>{const r=await call('/register','POST',{name:email,email,password:'Test-password-123'});return r.headers.get('set-cookie').split(';')[0];};
  const reason='Contenido revisado por el equipo';
  try{
    await start();const owner=await register('owner@example.com'),author=await register('author@example.com');
    await register('admin@example.com');grantAdmin(join(dir,'buscados.sqlite'),'admin@example.com');
    const login=await call('/login','POST',{email:'admin@example.com',password:'Test-password-123'}),admin=login.headers.get('set-cookie').split(';')[0];
    const pet=await (await call('/cases','POST',{kind:'lost',name:'Luna',species:'Perro',city:'Bogotá',zone:'Parque',description:'Prueba',photos:[]},owner)).json();
    const path='/cases/'+pet.id+'/comments',body={text:'Comentario público',clientId:randomUUID()};
    assert.equal((await call(path,'POST',body)).status,401);
    assert.equal((await call('/admin/comments')).status,401);assert.equal((await call('/admin/comments','GET',null,owner)).status,403);
    for(const change of [{text:' '},{text:'x'.repeat(1001)},{clientId:'bad'}])assert.equal((await call(path,'POST',{...body,...change},author)).status,400);
    let r=await call(path,'POST',body,author);assert.equal(r.status,201);let comment=await r.json();
    assert.equal((await get(path)).items[0].canEdit,false);assert.equal((await get(path,author)).items[0].canEdit,true);
    assert.equal((await get('/cases/'+pet.id)).commentCount,1);
    assert.equal((await call(path,'POST',body,author)).status,200);assert.equal((await get(path)).items.length,1);
    assert.equal((await call(path,'POST',{...body,text:'Otro'},author)).status,409);
    const item='/comments/'+comment.id,review='/admin/comments/'+comment.id;
    for(const cookie of [owner,admin])assert.equal((await call(item,'PATCH',{revision:1,text:'No autorizado'},cookie)).status,403);
    const races=await Promise.all(['Primero','Segundo'].map(text=>call(item,'PATCH',{revision:1,text},author)));assert.deepEqual(races.map(r=>r.status).sort(),[200,409]);
    comment=(await get(path,author)).items[0];
    assert.equal((await call(review,'PATCH',{revision:comment.revision,status:'hidden',reason:'corto'},admin)).status,400);
    comment=await (await call(review,'PATCH',{revision:comment.revision,status:'hidden',reason},admin)).json();
    assert.equal((await get(path)).items.length,0);assert.equal((await get(path,owner)).items.length,0);assert.equal((await get(path,author)).items[0].status,'hidden');
    assert.equal((await get('/cases/'+pet.id)).commentCount,0);
    assert.equal((await call(item,'PATCH',{revision:comment.revision,status:'visible',text:'Restaurar'},author)).status,400);
    comment=await (await call(item,'PATCH',{revision:comment.revision,text:'Texto corregido'},author)).json();assert.equal(comment.status,'hidden');
    db=new DatabaseSync(join(dir,'buscados.sqlite'));
    db.exec("CREATE TRIGGER fail_comment_audit BEFORE INSERT ON audit WHEN NEW.action='restore_comment' BEGIN SELECT RAISE(ABORT,'test comment rollback'); END;");
    assert.equal((await call(review,'PATCH',{revision:comment.revision,status:'visible',reason},admin)).status,500);
    assert.equal((await get(path,author)).items[0].revision,comment.revision);db.exec('DROP TRIGGER fail_comment_audit');
    comment=await (await call(review,'PATCH',{revision:comment.revision,status:'visible',reason},admin)).json();
    await call('/admin/cases/'+pet.id+'/moderation','PATCH',{visibility:'hidden',reason},admin);
    for(const cookie of [undefined,owner,author,admin])assert.equal((await call(path,'GET',null,cookie)).status,404);
    assert.equal((await call(path,'POST',{text:'Nuevo',clientId:randomUUID()},author)).status,404);
    assert.equal((await call(item,'PATCH',{revision:comment.revision,text:'Cambio'},author)).status,404);
    assert.equal((await get('/admin/comments',admin)).items.length,1);
    await call('/admin/cases/'+pet.id+'/moderation','PATCH',{visibility:'visible',reason},admin);
    comment=await (await call(item,'PATCH',{revision:comment.revision,status:'deleted'},author)).json();assert.equal(comment.text,'');
    assert.equal((await get(path)).items.length,0);assert.equal((await call(review,'PATCH',{revision:comment.revision,status:'visible',reason},admin)).status,409);
    assert.equal((await call(path,'POST',body,author)).status,200);assert.equal((await get(path)).items.length,0);
    // Paginación sobre suficientes comentarios y límite de publicación diario.
    for(let i=0;i<50;i++){
      db.exec('DELETE FROM comment_limits');
      const res=await call(path,'POST',{text:'Página '+i,clientId:randomUUID()},author);
      assert.equal(res.status,i<49?201:429);
    }
    const first=await get(path),second=await get(path+'?before='+first.nextBefore);assert.equal(first.items.length,20);assert.equal(second.items.length,20);assert.ok(first.items.every(a=>second.items.every(b=>a.id!==b.id)));
    const last=await get(path+'?before='+second.nextBefore);assert.equal(last.items.length,9);assert.equal(last.hasMore,false);
    assert.equal((await call(path+'?before=-1')).status,400);
    db.exec('DELETE FROM comment_limits');
    for(let i=0;i<11;i++)assert.equal((await call(path,'POST',{text:'Límite '+i,clientId:randomUUID()},owner)).status,i<10?201:429);
    assert.ok((await get('/admin/audit',admin)).items.some(item=>item.action==='hide_comment'));
    db.close();db=null;await stop();await start();assert.equal((await get('/cases/'+pet.id)).commentCount,59);
  }finally{db?.close();if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});

test('Vistas de comentarios: escape, acciones del autor y ausencia de controles en caso oculto',()=>{
  const attack='<script>alert(1)</script>',item={id:1,caseId:'case',authorName:attack,text:attack,status:'visible',revision:1,created:new Date().toISOString(),canEdit:true};
  for(const html of [commentCard(item),moderationComment(item)]){assert.ok(!html.includes(attack));assert.match(html,/&lt;script&gt;/);}
  assert.match(commentCard(item),/data-comment-edit/);assert.doesNotMatch(commentCard({...item,canEdit:false}),/data-comment-edit/);
  assert.equal(commentsSection({visibility:'hidden'}),'');assert.match(commentsSection({id:'case',visibility:'visible'}),/Inicia sesión/);
  assert.doesNotMatch(moderationComment({...item,status:'deleted'}),/<form/);
});
