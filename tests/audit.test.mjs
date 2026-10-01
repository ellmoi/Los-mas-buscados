import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.mjs';
import {request as apiRequest,api} from '../frontend/js/services/api.js';

test('Rutas estáticas codificadas conservan permisos y no exponen archivos privados',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'buscados-audit-')),server=createApp({dataDir:dir});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const registered=await fetch(base+'/api/v1/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Audit',email:'audit@example.com',password:'Test-only-123'})});
  const cookie=registered.headers.get('set-cookie').split(';')[0];
  const disguised='/frontend/%2e%2e%2fadmin/index.html';
  assert.equal((await fetch(base+disguised)).status,401);assert.equal((await fetch(base+disguised,{headers:{Cookie:cookie}})).status,403);
  for(const path of ['/frontend/%ZZ','/frontend/%2e%2e%2f.env','/data/buscados.sqlite','/backups/a.sqlite'])assert.equal((await fetch(base+path)).status,404);
  for(const path of ['/','/frontend/js/data/content-data.js','/frontend/js/app.js','/frontend/css/social.css'])assert.equal((await fetch(base+path)).status,200);
 }finally{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});

test('El cliente distingue errores HTTP, respuestas no JSON y fallas de conexión',async()=>{
 const previous=globalThis.fetch;
 try{
  globalThis.fetch=async()=>({ok:false,status:404,json:async()=>({error:'No existe'})});assert.equal(await api.getPet('missing'),null);
  globalThis.fetch=async()=>({ok:false,status:403,json:async()=>({error:'Sin permiso'})});await assert.rejects(apiRequest('/test'),error=>error.status===403&&error.message==='Sin permiso');
  globalThis.fetch=async()=>({ok:true,json:async()=>{throw new SyntaxError('HTML');}});await assert.rejects(apiRequest('/test'),/datos válidos/);
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};await assert.rejects(apiRequest('/test'),/No se pudo conectar/);
 }finally{globalThis.fetch=previous;}
});
