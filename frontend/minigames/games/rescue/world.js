export const WORLD = {width: 768, height: 576, tile: 32, viewWidth: 384, viewHeight: 288};
export const places = [
  {id: 'point1', name: 'Punto 1', x: 208, y: 216, available:true},
  {id: 'point2', name: 'Punto 2', x: 560, y: 192, available:false},
  {id: 'point3', name: 'Punto 3', x: 176, y: 356, available:false},
  {id: 'point4', name: 'Punto 4', x: 572, y: 386, available:false},
  {id: 'point5', name: 'Punto 5', x: 650, y: 290, available:false},
];
export const buildings = [
  {x: 72, y: 62, w: 128, h: 94, name: 'CASA', color: '#d3b184', roof: '#a75746'},
  {x: 64, y: 398, w: 192, h: 92, name: 'COMERCIOS', color: '#e0c595', roof: '#497f7b'},
  {x: 496, y: 424, w: 160, h: 94, name: 'REFUGIO · LMB', color: '#e0cfa6', roof: '#b26448'},
];
export const trees = [[40,70],[238,76],[50,208],[250,186],[455,66],[518,64],[614,69],[708,68],[712,161],[451,195],[49,342],[292,474],[690,454],[706,535],[422,523]];
export const benches = [{x: 479,y: 143,w: 40,h: 15},{x: 607,y: 142,w: 40,h: 15}];
export const solids = [
  ...buildings, ...trees.map(([x,y]) => ({x:x-15,y:y-16,w:30,h:40})), ...benches.map(b=>({...b,h:b.h+5})),
  {x: 20,y: 20,w: 728,h: 9}, {x: 20,y: 547,w: 728,h: 9},
  {x: 20,y: 20,w: 9,h: 536}, {x: 739,y: 20,w: 9,h: 536},
];

export function createWorld({selectedAvatar='volunteer'}={}) {
  return {player: {x:136,y:280,facing:'up',pose:'idle-up'},selectedAvatar,avatarName:'',
    time:0,visited:new Set(),eventArmed:true,lastResult:null,
    completedEvents:{point1:false,point2:false,point3:false,point4:false,point5:false},
    mode:'intro',activeEvent:null,eventPosition:null,scene:null,combat:null};
}
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export const nearPlace = world => places.find(p => distance(p,world.player) < 29);
export function canStand(x,y) {
  // Caja de los pies, no del sprite: permite pasar detrás de copas y tejados.
  const radius=6;
  return x>=radius && y>=radius && x<=WORLD.width-radius && y<=WORLD.height-radius &&
    !solids.some(b => x+radius>b.x && x-radius<b.x+b.w && y+radius>b.y && y-radius<b.y+b.h);
}
export function cameraFor(player) {
  return {x:Math.round(Math.max(0,Math.min(WORLD.width-WORLD.viewWidth,player.x-WORLD.viewWidth/2))),
    y:Math.round(Math.max(0,Math.min(WORLD.height-WORLD.viewHeight,player.y-WORLD.viewHeight/2)))};
}
export function updateWorld(world, direction, dt) {
  dt=Math.min(Math.max(dt,0),0.05); world.time+=dt;
  const p=world.player, movement={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[direction];
  let moved=false;
  if(movement) {
    p.facing=direction;
    const x=p.x+movement[0]*90*dt,y=p.y+movement[1]*90*dt;
    if(canStand(x,y)){moved=x!==p.x||y!==p.y;p.x=x;p.y=y;}
  }
  p.pose=(moved?'walk-':'idle-')+p.facing;
  const near=nearPlace(world);
  if(near)world.visited.add(near.id);
  if(distance(p,places[0])>52)world.eventArmed=true;
  return near?.id==='point1'&&world.eventArmed&&!world.completedEvents.point1;
}
export function returnFromCombat(world,result) {
  world.lastResult=result;
  if(world.activeEvent==='point1'&&result?.result==='victory')world.completedEvents.point1=true;
  world.eventArmed=false;
  if(world.eventPosition)Object.assign(world.player,world.eventPosition);
  world.player.pose='idle-'+world.player.facing;
}
