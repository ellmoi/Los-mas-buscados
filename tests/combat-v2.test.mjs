import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,act,update,attackCue,combatResult} from '../frontend/minigames/games/combat/model.js';
const create=()=>createCombat({advanced:true});
function advance(g,t){for(let i=0;i<Math.round(t*100);i++)update(g,.01);}
function until(g,condition){for(let i=0;i<4000&&!condition();i++)update(g,.01);assert.ok(condition());}

test('V2: golpes rápido/fuerte, costes, recuperación y agotamiento de stamina',()=>{
  const quick=create(),heavy=create();act(quick,'punch');act(heavy,'heavy');
  assert.equal(quick.player.stamina,92);assert.equal(heavy.player.stamina,76);
  advance(quick,.16);advance(heavy,.16);assert.equal(quick.enemy.hp,90);assert.equal(heavy.enemy.hp,100);
  advance(heavy,.32);assert.equal(heavy.enemy.hp,74);assert.equal(heavy.player.state,'heavy');
  heavy.player.stamina=0;advance(heavy,.4);assert.equal(act(heavy,'heavy'),false);
  advance(heavy,1);assert.ok(heavy.player.stamina>0&&heavy.player.stamina<100);
  const g=create();act(g,'block');advance(g,.1);assert.equal(g.player.stamina,100,'Bloquear solo consume al recibir impactos');
});
test('V2: bloqueo perfecto, ventana limitada y rival vulnerable sin daño',()=>{
  const g=create();until(g,()=>g.enemy.state==='telegraph');advance(g,.72);act(g,'block');
  until(g,()=>g.enemy.state==='stunned');assert.equal(g.player.hp,100);assert.equal(g.stats.perfect,1);assert.equal(g.stats.spent,4);
  act(g,'heavy');advance(g,.47);assert.equal(g.enemy.hp,61);assert.equal(g.stats.hits,1);
  const early=create();act(early,'block');until(early,()=>early.enemy.state==='quick-attack');
  assert.equal(early.player.hp,97);assert.equal(early.stats.spent,12);assert.equal(early.stats.perfect,0);
  const spam=create();act(spam,'block');advance(spam,.05);act(spam,'release');act(spam,'block');
  assert.ok(spam.player.blockAt<0,'Soltar/pulsar repetidamente no reinicia la ventana perfecta');
});
test('V2: avisos direccionales, ambos esquives y fallo por dirección incorrecta',()=>{
  const g=create();until(g,()=>g.enemy.state==='telegraph');assert.match(attackCue(g),/DERECHA/);
  advance(g,.65);act(g,'dodge-right');until(g,()=>g.enemy.state==='quick-attack');
  assert.equal(g.player.hp,100);assert.equal(g.stats.dodges,1);
  until(g,()=>g.enemy.state==='telegraph');assert.match(attackCue(g),/IZQUIERDA/);
  advance(g,.9);act(g,'dodge-left');until(g,()=>g.enemy.state==='heavy-attack');
  assert.equal(g.player.hp,100);assert.equal(g.stats.dodges,2);
  const wrong=create();until(wrong,()=>wrong.enemy.state==='telegraph');advance(wrong,.65);act(wrong,'dodge-left');
  until(wrong,()=>wrong.enemy.state==='quick-attack');assert.equal(wrong.player.hp,84);
});
test('V2: golpe fuerte deja expuesto; guardia sin resistencia no evita daño',()=>{
  const g=create();until(g,()=>g.enemy.state==='telegraph');advance(g,.65);act(g,'heavy');
  until(g,()=>g.enemy.state==='quick-attack');assert.equal(g.player.hp,76);assert.equal(g.player.state,'hit');
  const tired=create();act(tired,'block');until(tired,()=>tired.enemy.state==='telegraph');tired.player.stamina=0;tired.player.regenAt=100;
  until(tired,()=>tired.enemy.state==='quick-attack');assert.equal(tired.player.hp,84);
});
test('V2: victoria, derrota y métricas locales coherentes; el resultado queda congelado',()=>{
  const g=create();for(let i=0;i<5000&&!g.result;i++){act(g,'punch');update(g,.01);}
  assert.equal(g.result,'victory');const r=combatResult(g);assert.ok(r.hits>0&&r.staminaSpent>0);assert.ok(r.efficiency<=100);assert.ok(r.score>=0);
  advance(g,10);assert.deepEqual(combatResult(g),r);
  const loss=create();until(loss,()=>loss.result==='defeat');assert.equal(loss.player.hp,0);assert.ok(combatResult(loss).damage>=100);
});
