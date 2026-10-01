// Arte original procedural: coordenadas enteras y paleta limitada, sin assets de terceros.
export function painter(ctx) {
  return (x,y,w,h,color) => {ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
}

// Un solo avatar terminado. La apariencia es un dato, independiente del movimiento.
export const avatars = {volunteer:{name:'Voluntario',shirt:'#368784',light:'#6eb0a1',skin:'#d9a16e',hair:'#413638'}};
export function person(ctx,x,y,{facing='down',step=0,shirt='#c36c55',light='#e69b72',skin='#d9a16e',hair='#413638',longHair=false}={}) {
  const r=painter(ctx),walk=Math.round(step),side=facing==='left'||facing==='right';
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  r(-10,-2,20,5,'#456553');r(-6,-10+walk,5,10,'#293d4a');r(2,-10-walk,5,10,'#344f5c');
  r(-7,-2+walk,6,3,'#253438');r(2,-2-walk,7,3,'#253438');
  r(-8,-23,16,15,shirt);r(-5,-21,5,10,light);r(-8,-10,16,3,'#315762');
  r(-11,-21-walk,4,12,shirt);r(8,-21+walk,4,12,shirt);r(-11,-11-walk,4,4,skin);r(8,-11+walk,4,4,skin);
  r(-6,-36,13,15,hair);r(-8,-32,16,10,skin);r(-6,-27,12,7,skin);
  r(-7,-37,14,6,hair);r(-8,-33,3,8,hair);r(5,-33,3,5,hair);
  r(-4,-35,8,2,'#655044');
  if(longHair){r(-9,-30,3,13,hair);r(7,-30,3,13,hair);}
  if(facing==='up'){r(-6,-31,13,9,hair);r(-4,-24,9,2,'#655044');}
  else if(side){const eye=facing==='left'?-6:4;r(eye,-29,2,2,'#263839');r(eye+(facing==='left'?-2:2),-26,3,3,skin);}
  else {r(-4,-29,2,2,'#263839');r(3,-29,2,2,'#263839');r(-1,-23,4,1,'#995f49');}
  // Emblema de voluntariado.
  if(facing!=='up'){r(side?1:4,-19,3,3,'#f6dfa4');r(side?2:5,-21,1,1,'#f6dfa4');}
  ctx.restore();
}
export function child(ctx,x,y,{reach=0,...appearance}={}){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(.72,.72);
  person(ctx,0,0,{...appearance,longHair:true});const r=painter(ctx);
  r(-12,-31,5,8,appearance.hair||'#413638');r(9,-31,5,8,appearance.hair||'#413638');
  if(reach){r(8,-22,8+Math.round(reach),4,appearance.shirt||'#c36c55');r(14+Math.round(reach),-22,4,4,'#d9a16e');}
  ctx.restore();
}
export function cat(ctx,x,y,time=0,{upset=false,scale=1}={}){
  const r=painter(ctx);ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
  r(-12,0,24,3,'#526651');r(-9,-10,18,10,'#a8a7a0');r(-7,-13,13,6,'#cecbc0');
  r(-8,-1,3,4,'#e1dac8');r(5,-1,3,4,'#e1dac8');r(4,-18,13,11,'#b6b4aa');
  r(4,upset?-17:-23,4,7,'#b6b4aa');r(13,upset?-17:-23,4,7,'#b6b4aa');
  r(6,-16,3,2,'#344b46');r(13,-16,3,2,'#344b46');r(10,-12,3,2,'#9c7568');
  r(2,-11,5,1,'#e8e0ca');r(14,-11,6,1,'#e8e0ca');
  const flick=upset?Math.round(Math.sin(time*9)*3):0;
  r(-15,-12+flick,7,3,'#999c96');r(-17,-18+flick,3,8,'#999c96');
  r(-3,-11,3,8,'#7b8581');r(2,-10,2,7,'#7b8581');ctx.restore();
}
export function dog(ctx,x,y,time=0,scale=1) {
  const r=painter(ctx);ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
  r(-12,0,28,4,'#536551');r(-9,-10,21,11,'#b17a4c');r(-6,-12,15,8,'#d9ad72');
  r(-8,-1,4,5,'#785038');r(6,-1,4,5,'#785038');r(8,-20,12,13,'#ddb682');
  r(6,-21,4,11,'#745139');r(17,-20,4,9,'#745139');r(15,-14,7,5,'#f2d6a0');
  r(20,-14,3,3,'#343e37');r(15,-18,2,2,'#343e37');r(8,-8,10,3,'#3a9291');
  r(-13,-14+(Math.floor(time*3)%2),4,8,'#b17a4c');ctx.restore();
}
export function tree(ctx,x,y) {
  const r=painter(ctx);r(x-22,y+7,49,13,'#5d8158');r(x-5,y-2,11,24,'#76563d');r(x,y-2,3,20,'#ae8050');
  r(x-23,y-26,45,28,'#315e4a');r(x-17,y-41,33,19,'#315e4a');
  r(x-21,y-29,37,22,'#46845a');r(x-14,y-39,25,23,'#59955e');
  r(x-12,y-34,12,6,'#87ad6b');r(x+8,y-18,11,8,'#3c7351');r(x-19,y-18,9,6,'#6b9f62');
}
