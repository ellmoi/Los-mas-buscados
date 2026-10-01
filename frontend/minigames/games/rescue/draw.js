import {WORLD,buildings,trees,benches,places,cameraFor,distance} from './world.js';
import {painter,person,child,cat,dog,tree,avatars} from '../shared/pixel-art.js';

export function createMapRenderer(canvas,mini) {
  const ctx=canvas.getContext('2d'),miniCtx=mini.getContext('2d');
  if(!ctx||!miniCtx)throw new Error('Este navegador necesita Canvas 2D.');
  const ground=document.createElement('canvas');ground.width=WORLD.width;ground.height=WORLD.height;
  const g=ground.getContext('2d'),r=painter(g);
  // Suelo y arquitectura se dibujan una vez; solo personajes y cámara cambian.
  for(let y=0;y<WORLD.height;y+=32)for(let x=0;x<WORLD.width;x+=32){
    r(x,y,32,32,(x/32+y/32)%3?'#87a76a':'#91ae70');
    r(x+7,y+11,2,3,'#71955f');r(x+22,y+25,4,1,'#a6bc7c');
  }
  r(316,28,100,519,'#ceb88f');r(29,239,710,88,'#ceb88f');
  r(324,28,84,519,'#dcccaa');r(29,247,710,72,'#dcccaa');
  r(114,152,44,96,'#dcccaa');r(147,320,57,78,'#dcccaa');
  r(417,167,265,49,'#dcccaa');r(540,200,40,48,'#dcccaa');r(543,320,58,104,'#dcccaa');
  for(let x=40;x<738;x+=24)r(x,283,11,1,'#b9a17d');
  for(let y=40;y<547;y+=24)r(364,y,1,10,'#b9a17d');
  r(446,95,252,35,'#a6b67b');
  // Límites sólidos, reconocibles visualmente.
  r(20,20,728,9,'#5d7357');r(20,547,728,9,'#5d7357');r(20,20,9,536,'#5d7357');r(739,20,9,536,'#5d7357');
  for(let x=20;x<748;x+=16){r(x,18,3,14,'#c4bd8d');r(x,545,3,14,'#c4bd8d');}
  for(const b of buildings){
    r(b.x+7,b.y+8,b.w,b.h,'#69835f');r(b.x,b.y,b.w,b.h,b.color);
    r(b.x,b.y+b.h-9,b.w,9,'#a48f72');r(b.x-3,b.y-8,b.w+6,39,b.roof);
    for(let y=b.y-4;y<b.y+28;y+=8)for(let x=b.x+2;x<b.x+b.w-5;x+=16){r(x,y,13,1,'#dfac7b');r(x+13,y,1,6,'#724d43');}
    r(b.x+10,b.y+35,b.w-20,13,'#f2e4bb');g.fillStyle='#344e48';g.font='bold 9px monospace';g.textAlign='center';g.fillText(b.name,b.x+b.w/2,b.y+45);
    for(const x of [b.x+13,b.x+b.w-35]){r(x,b.y+55,23,23,'#587879');r(x+3,b.y+58,16,15,'#93b8a6');r(x+10,b.y+55,2,23,'#f6e3b9');r(x-2,b.y+79,27,4,'#9c7f61');}
    r(b.x+b.w/2-11,b.y+b.h-33,23,33,'#5d6454');r(b.x+b.w/2-8,b.y+b.h-29,16,21,'#7e9176');r(b.x+b.w/2+6,b.y+b.h-17,2,2,'#ebcd8d');
    if(b.name==='COMERCIOS')for(let x=b.x+5;x<b.x+b.w-5;x+=12)r(x,b.y+49,11,8,(x-b.x)%24<12?'#dd875e':'#f1d9a1');
  }
  for(const b of benches){r(b.x,b.y+4,b.w,b.h-4,'#8a6347');r(b.x,b.y,b.w,4,'#c19a66');r(b.x+3,b.y+b.h,4,5,'#445b50');r(b.x+b.w-7,b.y+b.h,4,5,'#445b50');}
  // Macizos florales sin colisión, diferenciados de los objetos sólidos.
  for(const [x,y] of [[83,175],[204,173],[468,374],[669,398]])for(let i=0;i<7;i++){r(x+i*4,y+(i%2)*5,3,3,i%2?'#edc879':'#cf775e');r(x+i*4+1,y+4+(i%2)*5,1,3,'#467956');}
  for(let x=475;x<675;x+=12){r(x,110,3,4,'#517e56');r(x-1,107,5,3,x%24?'#ecc277':'#d58575');}
  g.fillStyle='#385d48';g.font='bold 10px monospace';g.textAlign='center';g.fillText('PARQUE DEL BARRIO',570,92);
  const actors=trees.map(([x,y])=>({x,y,draw:()=>tree(ctx,x,y)}));
  actors.push({x:607,y:187,draw:time=>dog(ctx,607,187,time)});
  actors.push({x:493,y:188,draw:()=>person(ctx,493,188,{facing:'right'})},{x:278,y:347,draw:()=>person(ctx,278,347,{shirt:'#70678f',light:'#ada0b8'})});
  actors.sort((a,b)=>a.y-b.y);
  const drawPlayer=world=>person(ctx,world.player.x,world.player.y,{...(avatars[world.selectedAvatar]||avatars.volunteer),facing:world.player.facing,step:world.player.pose.startsWith('walk')?Math.sin(world.time*14)*2:0});
  let lastMini='';
  return function draw(world,showMini=true) {
    const camera=cameraFor(world.player);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(ground,camera.x,camera.y,384,288,0,0,384,288);
    ctx.save();ctx.translate(-camera.x,-camera.y);
    const dynamic=familyActors(ctx,world);
    dynamic.push({x:world.player.x,y:world.player.y,draw:()=>drawPlayer(world)});dynamic.sort((a,b)=>a.y-b.y);
    let i=0;
    for(const actor of actors){
      while(i<dynamic.length&&dynamic[i].y<actor.y)dynamic[i++].draw(world.time);
      if(actor.x>=camera.x-30&&actor.x<=camera.x+414&&actor.y>=camera.y-25&&actor.y<=camera.y+333)actor.draw(world.time);
    }
    while(i<dynamic.length)dynamic[i++].draw(world.time);
    const d=painter(ctx);
    places.forEach((p,i)=>{
      d(p.x-6,p.y+10,12,12,p.available?'#315951':'#71766a');
      ctx.fillStyle='#fff0bd';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText(world.completedEvents[p.id]?'✓':String(i+1),p.x,p.y+20);
    });
    ctx.restore();
    const key=[Math.round(world.player.x/4),Math.round(world.player.y/4),world.completedEvents.point1,showMini].join();
    if(!showMini||key===lastMini)return;lastMini=key;
    miniCtx.imageSmoothingEnabled=false;const m=painter(miniCtx),sx=mini.width/WORLD.width,sy=mini.height/WORLD.height;
    m(0,0,mini.width,mini.height,'#87a76a');m(316*sx,0,100*sx,mini.height,'#dcccaa');m(0,239*sy,mini.width,88*sy,'#dcccaa');
    for(const b of buildings)m(b.x*sx,b.y*sy,b.w*sx,b.h*sy,'#805e49');
    places.forEach((p,i)=>{m(p.x*sx-4,p.y*sy-4,8,8,p.available?'#244c46':'#71766a');miniCtx.fillStyle='#fff0bd';miniCtx.font='7px monospace';miniCtx.textAlign='center';miniCtx.fillText(world.completedEvents[p.id]?'✓':String(i+1),p.x*sx,p.y*sy+3);});
    const goal=places.find(p=>p.available&&!world.completedEvents[p.id]);
    if(goal){miniCtx.strokeStyle='#ffecad';miniCtx.lineWidth=1;miniCtx.strokeRect(Math.round(goal.x*sx)-6,Math.round(goal.y*sy)-6,12,12);}
    m(world.player.x*sx-2,world.player.y*sy-2,5,5,'#192f39');m(world.player.x*sx-1,world.player.y*sy-1,3,3,'#ffffff');
  };
}

function familyActors(ctx,world){
  if(!world.scene&&!world.completedEvents.point1&&distance(world.player,places[0])>80)return [];
  const index=world.scene?.index??0,done=world.completedEvents.point1;
  const rough=index===0&&!done,retreat=rough?Math.max(0,Math.sin(world.time*2.5))*9:10;
  const reach=rough?2+Math.sin(world.time*4)*2:0;
  const actors=[
    {x:181,y:192,draw:()=>child(ctx,181,192,{facing:'right',shirt:'#b5768c',light:'#e2a7b5',reach})},
    {x:189,y:215,draw:()=>child(ctx,189,215,{facing:'right',shirt:'#967cad',light:'#bfa6cf',reach})},
    {x:212+retreat,y:198,draw:()=>cat(ctx,212+retreat,198,world.time,{upset:rough})},
  ];
  if(index>=3||done){
    const progress=index===3&&!done?Math.min(1,world.scene.time/.8):1;
    const father={x:136+32*progress,y:160+22*progress},mother={x:136+7*progress,y:160+45*progress};
    actors.push({...father,draw:()=>person(ctx,father.x,father.y,{shirt:'#934f47',light:'#b86d55',step:progress<1?Math.sin(world.time*14)*2:0})});
    actors.push({...mother,draw:()=>person(ctx,mother.x,mother.y,{shirt:'#6b7893',light:'#a0adc2',longHair:true,step:progress<1?Math.sin(world.time*14)*2:0})});
  }
  return actors;
}
