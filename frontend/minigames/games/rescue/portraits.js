import {avatars,painter} from '../shared/pixel-art.js';

function volunteer(ctx,appearance){
  const r=painter(ctx),a=appearance;
  r(0,0,160,160,'#203e3d');r(8,8,144,144,'#365650');
  // Hombros y cuello conservan los colores del avatar del mapa.
  r(25,132,110,28,a.shirt);r(38,124,84,16,a.light);r(63,113,36,26,a.skin);
  r(40,130,22,12,a.shirt);r(101,130,21,12,a.shirt);r(118,143,7,7,'#f6dfa4');
  r(42,29,78,70,a.hair);r(49,23,60,16,a.hair);r(35,62,13,25,a.skin);r(115,64,12,24,a.skin);
  r(47,47,69,54,a.skin);r(54,97,57,18,a.skin);r(63,113,34,6,'#b77f5e');
  r(47,45,8,51,'#bc855f');r(109,53,7,47,'#bc855f');
  r(44,34,68,16,a.hair);r(52,29,38,6,'#695049');r(44,47,10,14,a.hair);r(106,43,14,17,a.hair);
  // Ceja izquierda fruncida, derecha elevada; mirada lateral de desaprobación.
  r(55,63,13,4,a.hair);r(66,67,10,4,a.hair);r(90,59,17,4,a.hair);
  r(56,75,21,8,'#f0dfbb');r(89,73,19,8,'#f0dfbb');
  r(68,75,6,7,'#26373b');r(100,73,6,7,'#26373b');
  r(55,83,20,2,'#b07c5b');r(90,81,18,2,'#b07c5b');
  r(82,77,5,18,'#bd865e');r(85,92,8,4,'#b17854');
  // Boca torcida, labio comprimido y una mejilla tensa: incomodidad, no furia genérica.
  r(66,103,19,3,'#754c43');r(84,100,12,3,'#754c43');r(94,98,5,3,'#754c43');
  r(76,109,17,2,'#b17854');r(57,97,6,2,'#bf855f');
}

export const reactionPortraits={volunteer};
export function drawPortrait(ctx,selectedAvatar){
  ctx.imageSmoothingEnabled=false;
  const appearance=avatars[selectedAvatar]||avatars.volunteer;
  (reactionPortraits[selectedAvatar]||reactionPortraits.volunteer)(ctx,appearance);
}
