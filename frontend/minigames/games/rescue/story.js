import {canStand} from './world.js';

// Una secuencia compartida para cualquier selectedAvatar; no contiene reglas de combate.
export const point1 = [
  {id:'notice',speaker:'Un ruido junto a la casa',text:'Un gato intenta alejarse. Dos niñas lo siguen y lo sujetan para seguir jugando; el gato se encoge y se aparta.',button:'Acercarme con calma',canLeave:true},
  {id:'intervene',speaker:'avatar',text:'Los animales no son juguetes. Puede asustarse y sentir dolor. Vamos a darle espacio.',button:'Continuar',wait:.65},
  {id:'girls',speaker:'Una de las niñas',text:'Pero… solo queríamos jugar con él.',button:'Escuchar'},
  {id:'parents',speaker:'Se abre la puerta',text:'El padre y la madre salen de la casa. Se acercan con los brazos tensos y miradas de reproche.',button:'Esperar',wait:.8},
  {id:'father',speaker:'Padre',text:'¿Por qué les estás diciendo cosas a mis hijas?',button:'Escuchar'},
  {id:'mother',speaker:'Madre',text:'El gato es nuestro.',button:'Escuchar'},
  {id:'claim',speaker:'Padre',text:'Nosotros veremos qué hacemos con él.',button:'Responder'},
  {id:'explain',speaker:'avatar',text:'Está asustado. Que sea suyo no significa que puedan tratarlo así. Déjenlo alejarse.',button:'Continuar'},
  {id:'conflict',speaker:'Padre',text:'¡No te metas! Apártate.',button:'Continuar'},
  {id:'reaction',speaker:'avatar',text:'¿En serio? Está asustado… y lo están justificando.',button:'Mantenerme firme',portrait:true},
];
export const currentBeat=world=>world.scene?point1[world.scene.index]:null;
export function beginPoint1(world){
  if(world.mode!=='exploration'||world.completedEvents.point1)return false;
  world.activeEvent='point1';world.eventArmed=false;world.combat=null;
  world.eventPosition={...world.player};
  world.scene={index:0,time:0};world.mode='dialogue';world.player.pose='idle-up';return true;
}
export function advanceStory(world){
  if(!world.scene||!['dialogue','reaction'].includes(world.mode))return false;
  if(world.scene.time<(currentBeat(world).wait||0))return false;
  if(world.scene.index===point1.length-1){world.mode='reaction-hold';world.scene.time=0;return true;}
  world.scene.index++;world.scene.time=0;world.mode=currentBeat(world).portrait?'reaction':'dialogue';return true;
}
export function updateStory(world,dt){
  if(!world.scene)return;
  dt=Math.min(Math.max(dt,0),.05);world.scene.time+=dt;world.time+=dt;
  if(currentBeat(world)?.id==='intervene'){
    const p=world.player,dx=202-p.x,dy=237-p.y,length=Math.hypot(dx,dy),step=Math.min(length,dt*50);
    if(length>1&&canStand(p.x+dx/length*step,p.y+dy/length*step)){
      p.x+=dx/length*step;p.y+=dy/length*step;p.facing=dy<0?'up':'down';p.pose='walk-'+p.facing;
    }else {p.facing='up';p.pose='idle-up';}
  }else world.player.pose='idle-up';
}
