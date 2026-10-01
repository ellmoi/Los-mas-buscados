import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {installNavigationHistory,navigationSection} from '../frontend/js/history-state.js';
import {safeReturn,loginForCase,returnAfterAuth} from '../frontend/js/auth-return.js';
import {createApp} from '../server.mjs';
import {home,listing} from '../frontend/js/pages/core.js';
import {explore} from '../frontend/js/pages/more.js';
import {detail} from '../frontend/js/pages/detail.js';
import {loadMinigame} from '../frontend/minigames/index.js';

test('Historial: volver y avanzar conservan posición, filtros y límite de salida',()=>{
 const listeners={},entries=[{url:'http://local/#/explorar?city=Bogota',state:{custom:'kept'}}];let index=0;
 const target={location:{href:entries[0].url},addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:name=>{delete listeners[name];}};
 target.history={get state(){return entries[index].state;},replaceState(state,_title,url){entries[index]={state,url};target.location.href=url;}};
 const dispose=installNavigationHistory(target);assert.equal(target.__nexoNavigationCount,0);assert.equal(entries[0].state.custom,'kept');
 const visit=url=>{entries.splice(++index);entries.push({url,state:null});target.location.href=url;listeners.hashchange();};
 const move=delta=>{index+=delta;target.location.href=entries[index].url;listeners.hashchange();};
 visit('http://local/#/mascota/first');visit('http://local/#/mascota/second');assert.equal(target.__nexoNavigationCount,2);
 move(-1);assert.equal(target.__nexoNavigationCount,1);move(-1);assert.equal(target.__nexoNavigationCount,0);assert.match(target.location.href,/city=Bogota/);
 move(1);assert.equal(target.__nexoNavigationCount,1);visit('http://local/#/minijuegos');assert.equal(target.__nexoNavigationCount,2);
 move(-1);move(-1);assert.equal(target.__nexoNavigationCount,0);dispose();assert.equal(Object.keys(listeners).length,0);
});
test('Login: conserva las rutas reales de usuario, filtros y origen del reporte',()=>{
 for(const route of ['#/notificaciones','#/configuracion','#/solicitudes-adopcion','#/solicitudes-adopcion/request-id','#/casos?state=resolved&mine=true','#/perfil?state=open','#/explorar?q=gato&city=Bogota','#/perdidos','#/encontrados','#/minijuegos/rescate','#/mascota/pet?from=source']){
  assert.equal(safeReturn(route),route);assert.equal(returnAfterAuth(loginForCase(route)),route);
 }
 for(const route of ['https://evil.test','//evil.test','#/login','#/registro','#/configuracion?next=https://evil.test','#/mascota/pet?from=<script>','#/notificaciones?token=private'])assert.equal(safeReturn(route),'#/casos');
});
test('Sección activa: detalles, alias y el único minijuego mantienen su navegación',()=>{
 assert.equal(navigationSection('/mascota/x','lost'),'/perdidos');assert.equal(navigationSection('/mascota/x','found'),'/encontrados');assert.equal(navigationSection('/mascota/x','adoption'),'/adopciones');
 for(const suffix of ['rescate','combat'])assert.equal(navigationSection('/minijuegos/'+suffix),'/minijuegos');
 assert.equal(navigationSection('/perfil'),'/casos');assert.equal(navigationSection('/publicaciones'),'/casos');assert.equal(navigationSection('/mensajes/x'),'/mensajes');assert.equal(navigationSection('/solicitudes-adopcion/x'),'/solicitudes-adopcion');
});
test('Integración HTTP: vistas principales, reporte/detalle y recursos de aplicación/admin/juego',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'buscados-integration-')),server=createApp({dataDir:dir}),original=globalThis.fetch;
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{globalThis.fetch=original;await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});});
 for(const html of ['index.html','admin/index.html']){
  for(const [,src] of readFileSync(new URL('../'+html,import.meta.url),'utf8').matchAll(/(?:src|href)="((?:\/)?frontend\/[^\"]+)"/g))assert.equal((await original(base+'/'+src.replace(/^\//,''))).status,200,src);
 }
 assert.equal((await original(base+'/admin/')).status,401);
 const reg=await original(base+'/api/v1/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Integración',email:'integration@example.test',password:'Test-only-password'})});assert.equal(reg.status,200);const cookie=reg.headers.get('set-cookie').split(';')[0];
 const saved=await original(base+'/api/v1/cases',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({kind:'lost',name:'Luna',species:'Gato',city:'Bogotá',zone:'Centro',description:'Collar violeta'})});assert.equal(saved.status,201);const pet=await saved.json();
 globalThis.fetch=(path,options)=>original(base+path,options);
 assert.match(await home(),/Luna/);assert.match(await listing('lost'),/data-kind="lost"/);assert.match(await listing('found'),/data-kind="found"/);assert.match(await explore(),/data-case-filters/);
 const page=await detail(pet.id);assert.match(page,/data-case-kind="lost"/);assert.match(page,/data-back-fallback="#\/perdidos"/);assert.match(page,/Iniciar sesión para contactar/);
 const filtered=await (await original(base+'/api/v1/cases?species=Gato&city=bogota')).json();assert.equal(filtered.total,1);
 const catalog=await loadMinigame('/minijuegos');assert.equal((catalog.html.match(/>Jugar</g)||[]).length,1);
 const game=await loadMinigame('/minijuegos/rescate');assert.equal(typeof game.mount,'function');assert.match(game.html,/#\/minijuegos/);
 for(const asset of ['/frontend/minigames/games/rescue/rescue.css','/frontend/minigames/games/combat/combat.css'])assert.equal((await original(base+asset)).status,200);
 assert.match(await home(),/Reportes recientes/);
});
