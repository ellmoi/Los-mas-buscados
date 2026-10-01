import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.mjs';
import {seedDemo,demoPassword} from '../scripts/demo.mjs';

test('Demo: fotos y conversaciones reales en base separada, carga única y datos existentes preservados',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'buscados-demo-'));let server;
  try{
    server=createApp({dataDir:dir,demo:true});
    assert.equal(seedDemo(join(dir,'buscados.sqlite')),true);assert.equal(seedDemo(join(dir,'buscados.sqlite')),false);
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port;
    const list=await (await fetch(base+'/api/v1/cases')).json();assert.equal(list.total,5);
    const photo=await fetch(base+list.items[0].image);assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/jpeg');assert.ok((await photo.arrayBuffer()).byteLength>10000);
    const login=await fetch(base+'/api/v1/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'demo@buscados.example',password:demoPassword})});assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie').split(';')[0];
    const conversations=await (await fetch(base+'/api/v1/conversations',{headers:{Cookie:cookie}})).json();assert.equal(conversations.items.length,2);
    assert.equal((await (await fetch(base+'/api/v1/editorial')).json()).total,2);
    assert.equal((await (await fetch(base+'/api/v1/veterinaries')).json()).total,3);
    const db=new DatabaseSync(join(dir,'buscados.sqlite'));
    try{assert.equal(db.prepare('SELECT count(*) AS n FROM messages').get().n,5);assert.equal(db.prepare('SELECT count(*) AS n FROM comments').get().n,3);db.exec("UPDATE comments SET text='Cambio conservado' WHERE id=1");assert.equal(seedDemo(join(dir,'buscados.sqlite')),false);assert.equal(db.prepare('SELECT text FROM comments WHERE id=1').get().text,'Cambio conservado');db.exec('DELETE FROM demo_seed');assert.throws(()=>seedDemo(join(dir,'buscados.sqlite')),/base vacía/);assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,2);}
    finally{db.close();}
  }finally{if(server?.listening)await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
});
