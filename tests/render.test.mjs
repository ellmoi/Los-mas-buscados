import {test} from 'node:test';
import assert from 'node:assert/strict';
import {petCard} from '../frontend/js/components/ui.js';
import {home,listing} from '../frontend/js/pages/core.js';
import {detail} from '../frontend/js/pages/detail.js';

test('Las vistas escapan contenido de usuarios y restringen los controles de edición',async()=>{
 const original=globalThis.fetch;
 const pet={id:'test-id',name:'<img src=x onerror=alert(1)>',description:'<script>alert(1)</script>',kind:'lost',state:'open',status:'Perdido',city:'Bogotá',zone:'Centro',photos:[],canEdit:false};
 globalThis.fetch=async path=>({ok:true,json:async()=>path.includes('/cases/test-id')?pet:{items:[pet],total:1}});
 try{
  assert.ok(!petCard(pet).includes('<script>'));
  const landing=await home();assert.match(landing,/Reportar perdido/);assert.match(landing,/Reportes recientes/);assert.ok(!landing.includes('<img src=x'));
  const publicDetail=await detail('test-id');assert.ok(!publicDetail.includes('data-edit-case'));assert.ok(!publicDetail.includes('<script>'));assert.match(publicDetail,/Reportar un problema con esta publicación/);
  pet.canEdit=true;pet.canResolve=true;pet.isOwner=true;assert.match(await detail('test-id'),/data-edit-case/);assert.match(await detail('test-id'),/Marcar como resuelto/);
  pet.state='resolved';assert.match(await detail('test-id'),/Reabrir caso/);
  pet.visibility='hidden';pet.moderationReason='<script>motivo</script>';const hidden=await detail('test-id');assert.match(hidden,/Publicación oculta por moderación/);assert.ok(!hidden.includes('<script>motivo'));
  assert.match(await listing('found'),/data-live-cases data-kind="found"/);
 }finally{globalThis.fetch=original;}
});
