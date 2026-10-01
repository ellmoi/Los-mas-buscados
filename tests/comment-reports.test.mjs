import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.mjs';
import {grantAdmin} from '../scripts/admin.mjs';
import {commentCard} from '../frontend/js/pages/comments.js';
import {commentReportCard} from '../frontend/js/admin-comment-reports.js';

test('Denuncias de comentarios: privacidad, duplicados, decisiones atómicas, conflictos, límites y persistencia',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'buscados-comment-reports-'));let server,base,db;
  const start=async()=>{server=createApp({dataDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/api/v1';};
  const stop=()=>new Promise(r=>server.close(r));
  const call=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const get=async(path,cookie)=>{const r=await call(path,'GET',null,cookie);assert.equal(r.status,200);return r.json();};
  const register=async email=>{const r=await call('/register','POST',{name:email,email,password:'Test-password-123'});return r.headers.get('set-cookie').split(';')[0];};
  const reason='Motivo privado de la denuncia',resolution='Decisión justificada del equipo';
  try{
    await start();const author=await register('author@example.com'),reporter=await register('reporter@example.com');
    await register('admin@example.com');grantAdmin(join(dir,'buscados.sqlite'),'admin@example.com');
    const login=await call('/login','POST',{email:'admin@example.com',password:'Test-password-123'}),admin=login.headers.get('set-cookie').split(';')[0];
    db=new DatabaseSync(join(dir,'buscados.sqlite'));
    const pet=await (await call('/cases','POST',{kind:'lost',name:'Luna',species:'Perro',city:'Bogotá',zone:'Parque',description:'Prueba',photos:[]},author)).json();
    const path='/cases/'+pet.id+'/comments';
    const create=async()=>{db.exec('DELETE FROM comment_limits');const r=await call(path,'POST',{text:'Comentario público',clientId:randomUUID()},author);assert.equal(r.status,201);return r.json();};
    const comment=await create(),report='/comments/'+comment.id+'/reports',queue='/admin/comment-reports';
    assert.equal((await get(path,reporter)).items[0].canReport,true);
    assert.equal((await get(path,author)).items[0].canReport,false);
    assert.equal((await get(path)).items[0].canReport,false);
    assert.equal((await call(report,'POST',{reason})).status,401);
    assert.equal((await call(report,'POST',{reason},author)).status,400);
    for(const value of ['', 'corto', 'x'.repeat(501),42])assert.equal((await call(report,'POST',{reason:value},reporter)).status,400);
    const races=await Promise.all([1,2].map(()=>call(report,'POST',{reason},reporter)));assert.deepEqual(races.map(r=>r.status).sort(),[200,201]);
    assert.equal((await call(report,'POST',{reason:'Un motivo diferente'},reporter)).status,409);
    assert.equal((await call(queue)).status,401);
    for(const cookie of [author,reporter]){
      assert.equal((await call(queue,'GET',null,cookie)).status,403);
      assert.equal((await call(queue+'/1','PATCH',{decision:'hide',reason:resolution,commentRevision:1},cookie)).status,403);
      assert.ok(!JSON.stringify(await get(path,cookie)).includes(reason));
    }
    let row=(await get(queue,admin)).items[0];assert.equal(row.reason,reason);assert.equal(row.reportedRevision,1);
    const endpoint=queue+'/'+row.id,body={decision:'hide',reason:resolution,commentRevision:1};
    assert.equal((await call(endpoint,'PATCH',{...body,decision:'bad'},admin)).status,400);
    await call('/comments/'+comment.id,'PATCH',{revision:1,text:'Texto corregido'},author);
    assert.equal((await call(endpoint,'PATCH',body,admin)).status,409);
    body.commentRevision=2;
    db.exec("CREATE TRIGGER fail_report_audit BEFORE INSERT ON audit WHEN NEW.action='review_comment_report' BEGIN SELECT RAISE(ABORT,'test report rollback'); END;");
    assert.equal((await call(endpoint,'PATCH',body,admin)).status,500);
    assert.equal((await get(queue,admin)).items[0].status,'pending');assert.equal((await get(path)).items[0].revision,2);
    assert.equal(db.prepare("SELECT count(*) AS n FROM audit WHERE action='hide_comment'").get().n,0);
    db.exec('DROP TRIGGER fail_report_audit');
    const decisions=await Promise.all([1,2].map(()=>call(endpoint,'PATCH',body,admin)));assert.deepEqual(decisions.map(r=>r.status).sort(),[200,409]);
    assert.equal((await get(path)).items.length,0);
    assert.equal((await call(report,'POST',{reason},admin)).status,404);
    row=(await get(queue+'?status=reviewed',admin)).items[0];assert.equal(row.resolution,resolution);assert.equal(row.commentStatus,'hidden');
    // An author withdrawal does not prevent resolving the report, but cannot be hidden/restored.
    const withdrawn=await create();await call('/comments/'+withdrawn.id+'/reports','POST',{reason},reporter);
    await call('/comments/'+withdrawn.id,'PATCH',{revision:1,status:'deleted'},author);
    row=(await get(queue,admin)).items[0];
    assert.equal((await call(queue+'/'+row.id,'PATCH',{...body,decision:'hide'},admin)).status,409);
    assert.equal((await call(queue+'/'+row.id,'PATCH',{...body,decision:'dismissed'},admin)).status,200);
    // Hidden cases cannot receive reports; admin retains the existing queue.
    const other=await create();
    await call('/admin/cases/'+pet.id+'/moderation','PATCH',{visibility:'hidden',reason:resolution},admin);
    assert.equal((await call('/comments/'+other.id+'/reports','POST',{reason},reporter)).status,404);
    await call('/admin/cases/'+pet.id+'/moderation','PATCH',{visibility:'visible',reason:resolution},admin);
    for(let i=0;i<19;i++){
      const c=await create();assert.equal((await call('/comments/'+c.id+'/reports','POST',{reason},reporter)).status,i<18?201:429);
    }
    assert.equal((await call('/comments/'+other.id+'/reports','POST',{reason},admin)).status,201);
    const first=await get(queue+'?status=all',admin),second=await get(queue+'?status=all&before='+first.nextBefore,admin);
    assert.equal(first.items.length,20);assert.equal(second.items.length,1);assert.equal(second.hasMore,false);assert.ok(first.items.every(a=>a.id!==second.items[0].id));
    for(const query of ['?before=-1','?before=1.5','?status=bad'])assert.equal((await call(queue+query,'GET',null,admin)).status,400);
    row=(await get(queue,admin)).items[0];assert.equal((await call(queue+'/'+row.id,'PATCH',{decision:'reviewed',reason:resolution,commentRevision:row.commentRevision},admin)).status,200);
    db.close();db=null;await stop();await start();
    assert.equal((await get(queue+'?status=reviewed',admin)).items.length,2);
    assert.ok((await get('/admin/audit',admin)).items.some(item=>item.action==='dismiss_comment_report'));
  }finally{db?.close();if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});

test('Vistas de denuncias: acciones según permisos y estado, texto escapado y aviso de edición',()=>{
  const attack='<script>alert(1)</script>',item={id:1,caseId:'case',authorName:attack,text:attack,reason:attack,reporterName:attack,status:'pending',commentStatus:'visible',commentRevision:2,reportedRevision:1,created:new Date().toISOString()};
  assert.match(commentCard({...item,canReport:true}),/data-comment-report/);
  assert.doesNotMatch(commentCard({...item,canReport:false}),/data-comment-report/);
  const html=commentReportCard(item);assert.ok(!html.includes(attack));assert.match(html,/&lt;script&gt;/);assert.match(html,/cambió desde la denuncia/);assert.match(html,/value="hide"/);
  assert.doesNotMatch(commentReportCard({...item,commentStatus:'deleted'}),/value="hide"/);
  assert.doesNotMatch(commentReportCard({...item,status:'reviewed',resolution:attack}),/<form/);
});
