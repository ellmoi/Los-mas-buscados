import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WORLD,places,solids,createWorld,canStand,cameraFor,updateWorld,returnFromCombat} from '../frontend/minigames/games/rescue/world.js';

test('Barrio: cuatro direcciones, ocho poses y colisiones sin atravesar sólidos',()=>{
  const w=createWorld();
  for(const dir of ['up','down','left','right']){
    w.player.x=365;w.player.y=280;const before={...w.player};updateWorld(w,dir,.05);
    assert.equal(w.player.pose,'walk-'+dir);assert.notDeepEqual(w.player,before);
    updateWorld(w,null,.05);assert.equal(w.player.pose,'idle-'+dir);
  }
  for(const b of solids)assert.equal(canStand(b.x+b.w/2,b.y+b.h/2),false);
  assert.equal(canStand(-1,50),false);assert.equal(canStand(WORLD.width+1,50),false);
  w.player.x=136;w.player.y=184;for(let i=0;i<100;i++)updateWorld(w,'up',.05);
  assert.ok(w.player.y>=162,'La casa bloquea el paso');
});

test('Barrio: los cinco lugares se conectan físicamente desde casa',()=>{
  // Búsqueda de caminos con los mismos límites y colisiones del jugador.
  const start=createWorld().player,queue=[[start.x,start.y]],seen=new Set([`${start.x},${start.y}`]);
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[8,0],[-8,0],[0,8],[0,-8]]){
    const [x,y]=queue[i],nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
    if(!seen.has(key)&&canStand(nx,ny)){seen.add(key);queue.push([nx,ny]);}
  }
  for(const p of places)assert.ok(queue.some(([x,y])=>Math.hypot(x-p.x,y-p.y)<20),p.name+' debe ser alcanzable');
});

test('Barrio: cámara limitada, evento, visita y regreso conservan estado',()=>{
  assert.deepEqual(cameraFor({x:0,y:0}),{x:0,y:0});
  assert.deepEqual(cameraFor({x:768,y:576}),{x:384,y:288});
  const w=createWorld();assert.equal(updateWorld(w,null,.01),false,'No se activa al entrar al barrio');
  Object.assign(w.player,{x:208,y:216});
  assert.equal(updateWorld(w,null,.01),true);assert.ok(w.visited.has('point1'));assert.equal(w.completedEvents.point1,false);
  w.activeEvent='point1';const position={...w.player};returnFromCombat(w,{result:'victory',score:120});
  assert.deepEqual(w.player,position);assert.equal(w.completedEvents.point1,true);
  assert.equal(updateWorld(w,null,.01),false);
  w.player.x-=60;updateWorld(w,null,.01);w.player.x+=60;
  assert.equal(updateWorld(w,null,.01),false,'Un evento completado no se repite al volver');
});

test('Puntos pendientes no activan historias; retirarse o perder no completa el Punto 1',()=>{
  const w=createWorld();
  for(const p of places.slice(1)){Object.assign(w.player,{x:p.x,y:p.y});assert.equal(updateWorld(w,null,.01),false);assert.equal(w.completedEvents[p.id],false);}
  w.activeEvent='point1';for(const result of [null,'defeat']){returnFromCombat(w,{result});assert.equal(w.completedEvents.point1,false);}
});
