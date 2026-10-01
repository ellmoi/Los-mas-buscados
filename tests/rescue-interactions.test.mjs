import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mount} from '../frontend/minigames/games/rescue/index.js';
import {createWorld,places} from '../frontend/minigames/games/rescue/world.js';
import {loadMinigame} from '../frontend/minigames/index.js';
import '../frontend/minigames/games/combat/index.js';

// Controladores reales; DOM/Canvas/RAF simulados, sin modificar reglas para ganar.
function setup(t){
  const keys=['window','document','MutationObserver','requestAnimationFrame','cancelAnimationFrame'];
  const saved=Object.fromEntries(keys.map(k=>[k,globalThis[k]])),listeners=new Set(),frames=new Map(),styles=new Set();
  const metrics={canvasCreated:0,maxFrames:0,mapPaints:0,miniPaints:0,objectiveWrites:0};
  const ctx=Object.fromEntries(['fillRect','fillText','strokeRect','save','restore','translate','scale','drawImage'].map(k=>[k,()=>{}]));
  function node(){const attrs={};return {hidden:false,disabled:false,style:{},dataset:{},textContent:'',childElementCount:0,
    classList:{add(){},remove(){}},
    addEventListener(type,callback,{signal}={}){const entry={target:this,type,callback};listeners.add(entry);signal?.addEventListener('abort',()=>listeners.delete(entry),{once:true});},
    fire(type,values={}){if(type==='click'&&this.disabled)return;for(const e of [...listeners])if(e.target===this&&e.type===type)e.callback({target:this,currentTarget:this,preventDefault(){},button:0,detail:0,...values});},
    focus(){},closest(){return null;},setPointerCapture(){},setAttribute(k,v){attrs[k]=v;},getAttribute:k=>attrs[k]||null,
    replaceChildren(){this.innerHTML='';},remove(){styles.delete(this);},getContext:()=>ctx,
  };}
  const mapKeys=['[data-map-view]','[data-combat-view]','[data-world]','[data-minimap]','[data-map-overlay]','[data-map-start]','[data-map-cancel]','[data-map-title]','[data-map-copy]','[data-map-message]','[data-fade]','[data-objective]','[data-interact]','[data-map-pause]','[data-toggle-map]','[data-portrait]','[data-avatar-control]','[data-avatar]','[data-avatar-name]',...places.map(p=>'[data-place="'+p.id+'"]')];
  const nodes=Object.fromEntries(mapKeys.map(k=>[k,node()]));
  Object.assign(nodes['[data-avatar-name]'],{value:'Luna',setCustomValidity(message){this.validationMessage=message;},reportValidity(){return !this.validationMessage;}});
  nodes['[data-map-start]'].click=()=>nodes['[data-map-start]'].fire('click');
  let objective='';Object.defineProperty(nodes['[data-objective]'],'textContent',{get:()=>objective,set:value=>{objective=value;metrics.objectiveWrites++;}});
  const canvas=nodes['[data-world]'],home={insertBefore(child){child.parentNode=home;}};canvas.parentNode=home;
  canvas.getContext=()=>({...ctx,drawImage(){metrics.mapPaints++;}});
  nodes['[data-minimap]'].querySelector=()=>Object.assign(node(),{width:128,height:96,getContext:()=>({...ctx,fillRect(){metrics.miniPaints++;}})});
  const controls=['up','down','left','right'].map(move=>Object.assign(node(),{dataset:{move}}));
  const map=nodes['[data-map-view]'];map.querySelectorAll=()=>controls;map.contains=x=>Object.values(nodes).includes(x)||controls.includes(x);
  const combatKeys=['[data-overlay]','[data-result-title]','[data-result-copy]','[data-start]','[data-continue]','[data-pause]','[data-restart]','[data-feedback]','#combat-player-hp','#combat-enemy-hp','[data-player-value]','[data-enemy-value]','#combat-stamina','[data-stamina-value]','[data-combat-summary]','[data-return]','[data-combat-canvas]'];
  const combatNodes=Object.fromEntries(combatKeys.map(k=>[k,node()]));
  const combatControls=['punch','heavy','block','dodge-left','dodge-right'].map(action=>Object.assign(node(),{dataset:{action}}));
  const combat=Object.assign(node(),{querySelector:k=>combatNodes[k],querySelectorAll:()=>combatControls,contains:x=>Object.values(combatNodes).includes(x)||x===canvas});
  combatNodes['[data-combat-canvas]'].replaceWith=child=>{assert.equal(child,canvas);child.parentNode=combat;};
  nodes['[data-combat-view]'].querySelector=()=>combat;
  const area=Object.assign(node(),{querySelector:k=>nodes[k]});
  const win=node(),doc=Object.assign(node(),{createElement(tag){if(tag==='canvas')metrics.canvasCreated++;return node();},head:{append:s=>styles.add(s)},querySelector:()=>null});
  let now=0,id=0;
  Object.assign(globalThis,{window:win,document:doc,MutationObserver:class{observe(){}disconnect(){}},requestAnimationFrame:cb=>{frames.set(++id,cb);metrics.maxFrames=Math.max(metrics.maxFrames,frames.size);return id;},cancelAnimationFrame:id=>frames.delete(id)});
  const world=createWorld();let dispose;
  t.after(()=>{try{dispose?.();}finally{Object.assign(globalThis,saved);}});
  dispose=mount({querySelector:()=>area},{session:world});
  function step(n){for(let i=0;i<n;i++){now+=10;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(now));}}
  const ui={nodes,combatNodes,map,combat,controls,combatControls,win,doc,frames,styles,listeners,dispose,step,world,metrics,canvas,home,
    start:()=>nodes['[data-map-start]'].fire('click'),
    move:(code,n)=>{map.fire('keydown',{code});step(n);win.fire('keyup',{code});},
    enter(){ui.start();ui.move('KeyD',80);ui.move('KeyW',80);assert.equal(world.mode,'dialogue');},
    reaction(){while(world.mode==='dialogue'){step(100);ui.start();}assert.equal(world.mode,'reaction');},
    async fight(){ui.enter();ui.reaction();ui.start();step(70);assert.equal(world.mode,'transition');await new Promise(setImmediate);step(60);assert.equal(world.mode,'combat');},
    winFight(){combatNodes['[data-start]'].fire('click');for(let i=0;i<35&&!world.combat.result;i++){combat.fire('keydown',{code:'KeyJ'});step(100);}assert.equal(world.combat.result,'victory');},
    return(){combatNodes['[data-continue]'].fire('click');assert.equal(world.mode,'result');ui.start();step(60);assert.equal(world.mode,'exploration');},
  };return ui;
}

test('Punto 1: recorrido completo, victoria, mismo canvas/reloj, regreso y no repetición',async t=>{
  const ui=setup(t),initial=ui.listeners.size;assert.equal(ui.frames.size,0);
  ui.nodes['[data-avatar-name]'].value='   ';ui.start();assert.equal(ui.world.mode,'intro');
  ui.nodes['[data-avatar-name]'].value='  Luna  ';
  await ui.fight();assert.equal(ui.world.avatarName,'Luna');assert.equal(ui.canvas.parentNode,ui.combat);assert.equal(ui.frames.size,0);
  assert.equal(ui.world.combat.advanced,true);assert.equal(ui.world.combat.protectedAnimal,'cat');
  assert.doesNotMatch(ui.nodes['[data-combat-view]'].innerHTML,/<canvas/);
  ui.winFight();assert.equal(ui.world.mode,'result');assert.equal(ui.frames.size,0);
  ui.return();assert.equal(ui.canvas.parentNode,ui.home);assert.equal(ui.world.completedEvents.point1,true);assert.equal(ui.world.avatarName,'Luna');
  assert.equal(ui.world.player.x,ui.world.eventPosition.x);assert.equal(ui.world.player.y,ui.world.eventPosition.y);
  assert.match(ui.nodes['[data-place="point1"]'].textContent,/Completado ✓/);
  ui.move('KeyS',90);ui.move('KeyW',90);ui.nodes['[data-interact]'].fire('click');assert.equal(ui.world.mode,'exploration');
  assert.equal(ui.listeners.size,initial);assert.equal(ui.styles.size,1);assert.equal(ui.metrics.canvasCreated,1,'Solo el suelo precalculado; no se crea otro canvas principal');assert.equal(ui.metrics.maxFrames,1);
  ui.dispose();assert.equal(ui.frames.size,0);assert.equal(ui.listeners.size,0);assert.equal(ui.styles.size,0);
});

test('Punto 1: derrota, reinicios sin listeners nuevos y victoria posterior',async t=>{
  const ui=setup(t);await ui.fight();const listeners=ui.listeners.size;
  ui.combatNodes['[data-start]'].fire('click');ui.step(4000);
  assert.equal(ui.world.combat.result,'defeat');assert.equal(ui.world.completedEvents.point1,false);assert.equal(ui.frames.size,0);
  for(let i=0;i<4;i++)ui.combatNodes['[data-restart]'].fire('click');
  assert.equal(ui.listeners.size,listeners);assert.equal(ui.frames.size,1);assert.equal(ui.world.combat.player.hp,100);
  ui.winFight();ui.return();assert.equal(ui.world.completedEvents.point1,true);assert.equal(ui.metrics.maxFrames,1);
});

test('Punto 1: retirarse o volver tras perder permite reintentar sin completar',async t=>{
  const ui=setup(t);ui.enter();ui.nodes['[data-map-cancel]'].fire('click');ui.step(20);assert.equal(ui.world.mode,'exploration');
  ui.nodes['[data-interact]'].fire('click');ui.reaction();ui.start();ui.step(70);await new Promise(setImmediate);ui.step(60);
  ui.combatNodes['[data-start]'].fire('click');ui.step(4000);ui.return();assert.equal(ui.world.completedEvents.point1,false);
  ui.nodes['[data-interact]'].fire('click');assert.equal(ui.world.mode,'dialogue');
});

test('Punto 1: diálogos bloquean movimiento; reacción, pausa y regreso conservan escena',async t=>{
  const ui=setup(t);ui.enter();const position={...ui.world.player};ui.move('KeyA',30);assert.deepEqual(ui.world.player,position);
  ui.start();assert.equal(ui.world.scene.index,1);ui.start();assert.equal(ui.world.scene.index,1,'Respeta la espera del diálogo');
  ui.doc.hidden=true;ui.doc.fire('visibilitychange');const time=ui.world.time;ui.step(100);assert.equal(ui.world.time,time);assert.equal(ui.frames.size,0);
  ui.doc.hidden=false;ui.start();ui.reaction();assert.equal(ui.nodes['[data-portrait]'].hidden,false);assert.equal(ui.nodes['[data-map-title]'].textContent,'Luna');
  const paints=ui.metrics.mapPaints;ui.step(20);assert.equal(ui.metrics.mapPaints,paints,'La reacción no repinta el barrio tapado por el retrato');
  ui.win.fire('blur');ui.start();assert.equal(ui.world.mode,'reaction');assert.equal(ui.nodes['[data-portrait]'].hidden,false);
  ui.start();ui.step(70);ui.win.fire('blur');await new Promise(setImmediate);ui.step(100);assert.equal(ui.world.mode,'paused');assert.equal(ui.frames.size,0);
  ui.start();ui.step(60);assert.equal(ui.world.mode,'combat');ui.combatNodes['[data-start]'].fire('click');
  ui.doc.hidden=true;ui.doc.fire('visibilitychange');assert.equal(ui.frames.size,0);const combatTime=ui.world.combat.time;ui.step(100);assert.equal(ui.world.combat.time,combatTime);
  ui.doc.hidden=false;ui.combatNodes['[data-start]'].fire('click');assert.equal(ui.frames.size,1);
});

test('Punto 1: controles táctiles, minimapa sin repintados en reposo y limpieza en transición',async t=>{
  const ui=setup(t);ui.start();const mini=ui.metrics.miniPaints,writes=ui.metrics.objectiveWrites;
  ui.step(100);assert.equal(ui.metrics.miniPaints,mini);assert.equal(ui.metrics.objectiveWrites,writes);
  const right=ui.controls.find(b=>b.dataset.move==='right');right.fire('pointerdown',{pointerId:2});ui.step(80);right.fire('pointercancel',{pointerId:2});
  const x=ui.world.player.x;ui.step(20);assert.equal(ui.world.player.x,x);
  ui.nodes['[data-toggle-map]'].fire('click');assert.equal(ui.nodes['[data-minimap]'].hidden,true);
  ui.nodes['[data-toggle-map]'].fire('click');assert.equal(ui.nodes['[data-minimap]'].hidden,false);
  ui.move('ArrowUp',80);ui.reaction();ui.start();ui.step(70);ui.dispose();await new Promise(setImmediate);ui.step(100);
  assert.equal(ui.listeners.size,0);assert.equal(ui.styles.size,0);assert.equal(ui.frames.size,0);assert.equal(ui.canvas.parentNode,ui.home);
});

test('Punto 1: controles táctiles de combate y retirada liberan el modo anterior',async t=>{
  const ui=setup(t);await ui.fight();ui.combatNodes['[data-start]'].fire('click');
  const control=action=>ui.combatControls.find(b=>b.dataset.action===action);
  control('heavy').fire('pointerdown',{pointerId:1});ui.step(50);assert.equal(ui.world.combat.enemy.hp,74);
  ui.step(60);control('block').fire('pointerdown',{pointerId:1});assert.equal(ui.world.combat.player.block,true);
  control('block').fire('pointercancel',{pointerId:1});assert.equal(ui.world.combat.player.block,false);
  ui.combatNodes['[data-return]'].fire('click');assert.equal(ui.frames.size,0);ui.start();ui.step(60);assert.equal(ui.world.completedEvents.point1,false);
});

test('Entrada única: catálogo → Jugar → barrio, cinco puntos y controles existentes',async()=>{
  const catalog=await loadMinigame('/minijuegos');assert.match(catalog.html,/href="#\/minijuegos\/rescate">Jugar/);
  const page=await loadMinigame('/minijuegos/rescate');assert.equal(typeof page.mount,'function');
  assert.equal((page.html.match(/data-place=/g)||[]).length,5);assert.equal((page.html.match(/data-move=/g)||[]).length,4);
});
