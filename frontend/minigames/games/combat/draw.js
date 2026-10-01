import {enemyPose} from './model.js';
import {dog,cat} from '../shared/pixel-art.js';

// Arte temporal en una resolución lógica fija. Sustituir enemy/player por
// drawImage(sprite, ...) no requiere cambiar las reglas ni los controles.
export function render(ctx, game, {reducedMotion=false}={}) {
  const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const text = (value, x, y, color = '#fff2d0', size = 10) => {
    ctx.fillStyle = color; ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center'; ctx.fillText(value, x, y);
  };
  const p = game.player, e = game.enemy, pose = enemyPose(game);
  const dodge = p.state === 'dodge-left' ? 15 : p.state === 'dodge-right' ? -15 : 0;
  const attacking=['attack','quick-attack','heavy-attack'].includes(e.state);
  const shake=game.advanced&&!reducedMotion&&game.time<game.shakeUntil?Math.round(Math.sin(game.time*95)*2):0;
  ctx.imageSmoothingEnabled = false;
  rect(0, 0, 384, 288, '#183535');
  ctx.save(); ctx.translate(dodge+shake, shake);
  // Una calle tranquila, sin representar la escena de maltrato.
  rect(-20, 0, 424, 145, '#b0cfc2');
  rect(18, 18, 74, 116, '#dba879'); rect(23, 12, 66, 8, '#755d52');
  rect(104, 40, 66, 94, '#e9caa0'); rect(251, 26, 111, 108, '#859d8a');
  for (const x of [31, 60, 116, 143, 267, 306, 335]) {
    rect(x, 49, 15, 24, '#416365'); rect(x + 2, 51, 5, 19, '#89adb0');
  }
  rect(39, 93, 24, 41, '#6b6660'); rect(281, 91, 27, 43, '#4b6460');
  rect(-20, 130, 424, 12, '#6b8775'); rect(-20, 142, 424, 146, '#777f75');
  rect(-20, 153, 424, 4, '#bac1a5');
  for (let i = 0; i < 5; i++) rect(20 + i * 82, 217, 35, 3, '#959b86');
  rect(340, 87, 6, 60, '#675b45'); rect(319, 62, 48, 30, '#426e57'); rect(328, 49, 33, 24, '#527e5b');
  if(game.advanced){
    // Fachadas originales: tejas, persianas, balcones, plantas y pavimento.
    for(let x=22;x<90;x+=10){rect(x,20,8,2,'#efd0a0');rect(x,24,1,12,'#b88266');}
    for(let y=80;y<129;y+=9){rect(21,y,14,1,'#be8b68');rect(72,y+4,17,1,'#be8b68');}
    rect(101,33,72,7,'#607a64');rect(110,84,50,4,'#91755c');
    for(let x=112;x<161;x+=6)rect(x,73,2,14,'#6f7460');
    rect(250,21,115,7,'#506b60');rect(261,109,13,16,'#aa7757');rect(258,101,20,10,'#578158');
    rect(267,96,8,11,'#86a163');rect(289,87,42,6,'#d2b792');
    for(let i=0;i<5;i++){rect(5+i*20,187+i*13,18,2,'#a8ac92');rect(358-i*16,180+i*15,24,2,'#a8ac92');}
    rect(26,133,104,4,'#e4d0a2');rect(29,142,103,8,'#525e50');
    for(let x=34;x<128;x+=12)rect(x,128,3,17,'#a09476');
    if(game.protectedAnimal==='cat')cat(ctx,302,210,game.time,{scale:1.25});
    else dog(ctx,302,210,game.time,1.25);
    rect(278,223,65,13,'#2e5147');text('A SALVO',310,233,'#ffe1aa',8);
  }
  // Sombra y rival frontal: hombros simétricos, rostro hacia la cámara.
  rect(145, 238, 98, 9, '#58645d');
  ctx.save();
  const lunge = attacking ? (e.state==='heavy-attack'?1.16:1.12) : 1;
  ctx.translate(192 + (pose === 'hit' ? 3 : 0), pose === 'defeated' ? 14 : pose==='stunned'?4:0);
  ctx.scale(lunge, lunge); ctx.translate(-192, 0);
  rect(166, 190, 22, 46, '#293f50'); rect(197, 190, 22, 46, '#293f50');
  rect(159, 234, 30, 9, '#202f38'); rect(197, 234, 30, 9, '#202f38');
  rect(157, 116, 70, 78, pose === 'hit' ? '#e6c096' : '#934f47');
  rect(168, 119, 11, 71, '#b86d55'); rect(181, 117, 21, 7, '#d39266');
  rect(178, 103, 29, 20, '#d39266');
  rect(167, 57, 49, 48, '#e0aa79'); rect(163, 70, 8, 24, '#c48660'); rect(214, 70, 7, 24, '#c48660');
  rect(166, 51, 51, 17, '#3b373b'); rect(169, 48, 39, 7, '#3b373b');
  rect(173, 75, 13, 4, '#3b373b'); rect(198, 75, 12, 4, '#3b373b');
  rect(179, 81, 4, 4, '#26393b'); rect(199, 81, 4, 4, '#26393b');
  rect(190, 84, 5, 9, '#b47759'); rect(183, 98, 19, 3, '#754e45');
  if(game.advanced){
    rect(168,56,5,13,'#2f3034');rect(173,52,17,4,'#5b4640');rect(205,61,9,6,'#312e32');
    rect(170,88,7,10,'#c18a62');rect(207,83,7,16,'#c18a62');rect(177,101,30,4,'#bf865f');
    rect(175,69,12,3,'#efbc8c');rect(198,69,11,3,'#efbc8c');rect(176,86,8,2,'#e8b482');
    rect(179,108,26,5,'#b37b58');rect(178,120,12,6,'#6d3b3e');rect(201,120,11,6,'#6d3b3e');
    rect(155,124,8,45,'#713f3f');rect(218,126,9,65,'#713f3f');rect(179,128,3,59,'#d08a65');
    rect(189,135,3,3,'#e8b887');rect(189,149,3,3,'#e8b887');rect(189,163,3,3,'#e8b887');
    rect(199,140,15,2,'#613c3a');rect(202,144,10,9,'#a55c4a');rect(160,187,66,5,'#483e40');
    rect(169,199,5,30,'#476070');rect(201,199,4,30,'#476070');rect(182,196,4,35,'#23333f');
    rect(158,239,31,3,'#b1aa8d');rect(197,239,31,3,'#b1aa8d');
  }
  const fist = (x, y, size = 23) => {
    rect(x - 3, y - 3, size + 6, size + 6, '#563f3b');
    rect(x, y, size, size, '#dfa477'); rect(x + 3, y + 3, size - 6, 5, '#f0c296');
    for (let i = 7; i < size - 2; i += 6) rect(x + i, y + 10, 2, 7, '#b47759');
  };
  if (pose === 'defeated') {
    rect(135, 130, 21, 52, '#934f47'); rect(228, 130, 21, 52, '#934f47');
    fist(134, 176); fist(228, 176);
  } else if (attacking) {
    if(game.advanced&&e.side==='right'){rect(205,117,39,35,'#934f47');fist(211,106,43);fist(142,114);}
    else {rect(143, 117, 39, 35, '#934f47'); fist(140, 106, 43); fist(225, 114);}
  } else {
    rect(142, 127, 22, 41, '#934f47'); rect(225, 125, 22, 43, '#934f47');
    fist(143, e.state === 'telegraph'&&(!game.advanced||e.side==='left') ? 72 : pose==='stunned'?145:111);
    fist(226, e.state==='telegraph'&&game.advanced&&e.side==='right'?72:pose==='stunned'?145:111);
  }
  ctx.restore(); ctx.restore();
  // Brazos del jugador desde el borde inferior, sin cuerpo ni vista lateral.
  const hand = (x, y, flip = false) => {
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    rect(-17, 20, 34, 96, '#304f57'); rect(-18, 17, 36, 15, '#6b9691');
    rect(-20, -12, 40, 36, '#372f35'); rect(-17, -10, 34, 31, '#bb805b');
    rect(-14, -7, 27, 8, '#e4ae7c'); rect(11, 5, 12, 15, '#d59a6b');
    for (let i = -7; i < 13; i += 8) rect(i, 1, 2, 8, '#845c49');
    if(game.advanced){rect(-14,22,6,76,'#446d70');rect(-12,15,21,3,'#e3ac77');rect(-15,-4,3,15,'#d29769');rect(-17,28,34,3,'#8ec2a9');}
    ctx.restore();
  };
  const punch = p.state === 'punch' ? Math.sin(Math.PI * Math.max(0, 1 - (p.until - game.time) / 0.32)) : 0;
  const heavy = p.state === 'heavy' ? Math.sin(Math.PI * Math.max(0,1-(p.until-game.time)/0.8)) : 0;
  if (p.state === 'block') { hand(153, 165); hand(232, 165, true); }
  else { hand(100 + punch * 64, 249 - punch * 103); hand(286-heavy*70, p.state === 'hit' ? 267 : 249-heavy*105, true); }
  if (e.state === 'telegraph' && !game.result) {
    rect(game.advanced?84:128, 12, game.advanced?216:128, 22, '#382f36'); text(game.advanced?`${e.type==='heavy'?'FUERTE':'RÁPIDO'} · ESQUIVA ${e.side==='left'?'DERECHA →':'← IZQUIERDA'}`:'! PREPARA ATAQUE', 192, 27, '#ffdc83');
  } else if (e.state === 'recovery' && !game.result) {
    rect(125, 12, 134, 22, '#233f3d'); text('RIVAL RECUPERANDO', 192, 27);
  }
  if (pose === 'hit') text('¡CONECTASTE!', 192, 45, '#fff2d0');
  if(pose==='stunned')text('¡PERFECTO! CONTRAATACA',192,45,'#fff2d0');
  if(pose==='guard'&&game.advanced)text('RIVAL EN GUARDIA',192,27,'#fff2d0');
  if (p.state === 'hit') { ctx.strokeStyle = '#f3c397'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 378, 282); text('¡IMPACTO!', 192, 272); }
  if (p.state === 'block') text('GUARDIA ALTA', 192, 271);
  if (dodge) text(dodge > 0 ? '← ESQUIVE' : 'ESQUIVE →', 192, 271);
}
