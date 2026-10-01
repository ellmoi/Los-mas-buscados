// Reglas independientes del DOM y del dibujo. Los tiempos están en segundos.
export function createCombat({advanced=false,protectedAnimal='dog'}={}) {
  return {
    advanced,
    protectedAnimal,
    time: 0, result: null, message: 'Observa al rival. Espera su señal.',
    player: {hp: 100, state: 'idle', until: 0, ready: 0, landed: false, block: false,
      stamina:100,regenAt:0,blockAt:-100,parryReady:0},
    enemy: {hp: 100, state: 'idle', until: 1.2, hurtUntil: 0,turn:0,type:'quick',side:'left'},
    stats:{hits:0,damage:0,dodges:0,perfect:0,spent:0,useful:0},
    shakeUntil:0,
  };
}

export function act(game, action) {
  if (game.result) return false;
  const p = game.player, t = game.time;
  if (action === 'release') {
    p.block = false;
    if (p.state === 'block') p.state = 'idle';
    return true;
  }
  if (action === 'block') {
    if (!['idle', 'block', 'hit'].includes(p.state)) return false;
    if(!p.block){p.blockAt=t>=p.parryReady?t:-100;p.parryReady=t+0.55;}
    p.block = true; p.state = 'block';
    game.message = 'Guardia alta · mantén para bloquear.';
    return true;
  }
  if (!['punch', 'dodge-left', 'dodge-right',...(game.advanced?['heavy']:[])].includes(action) || t < p.ready ||
      !['idle', 'block', 'hit'].includes(p.state)) return false;
  const cost=action==='heavy'?24:action==='punch'?8:14;
  if(game.advanced){
    if(p.stamina<cost){game.message='Sin resistencia suficiente. Baja el ritmo para recuperarte.';return false;}
    spend(game,cost);
  }
  p.block = false; p.state = action; p.landed = false;
  p.until = t + (action === 'heavy' ? 0.8 : action === 'punch' ? 0.32 : 0.46);
  p.ready = t + (action === 'heavy' ? 1 : action === 'punch' ? 0.55 : 0.7);
  game.message = action==='heavy'?'Golpe fuerte · quedas expuesto un instante.':action === 'punch' ? '¡Golpe!' : 'Esquive a la ' + (action === 'dodge-left' ? 'izquierda.' : 'derecha.');
  return true;
}

export function update(game, dt) {
  if (game.result) return;
  // El controlador limita cada paso; evita saltarse toda la señal tras un parón.
  dt=Math.min(Math.max(dt, 0), 0.05);game.time += dt;
  const p = game.player, e = game.enemy, t = game.time;
  if(game.advanced&&t>=p.regenAt&&['idle','block'].includes(p.state))p.stamina=Math.min(100,p.stamina+dt*(p.state==='block'?6:18));
  if (['punch','heavy'].includes(p.state) && !p.landed && t >= p.until - (p.state==='heavy'?0.35:0.18)) {
    p.landed = true;
    const damage = game.advanced?Math.round((p.state==='heavy'?26:10)*(['recovery','stunned'].includes(e.state)?1.5:e.state==='guard'?0.5:1)):e.state === 'recovery' ? 18 : 10;
    game.stats.hits++;if(game.advanced)game.stats.useful+=p.state==='heavy'?24:8;
    game.shakeUntil=t+0.15;
    e.hp = Math.max(0, e.hp - damage); e.hurtUntil = t + 0.2;
    game.message = game.advanced?`¡Conectaste! Determinación del rival: −${damage}.`:damage === 18 ? '¡Conectaste! Rival en recuperación: −18.' : '¡Conectaste! Rival: −10.';
    if (!e.hp) {
      e.state = 'defeated'; game.result = 'victory'; p.block = false;
      game.message = 'Protegiste al animal. El agresor se ha rendido.';
      return;
    }
  }
  if (!['idle', 'block'].includes(p.state) && t >= p.until) p.state = 'idle';
  if (t < e.until) return;
  if(game.advanced){advanceEnemy(game);return;}
  if (e.state === 'idle') {
    e.state = 'telegraph'; e.until = t + 0.85;
    game.message = '¡ATENCIÓN! Levanta el puño. Bloquea o esquiva.';
  } else if (e.state === 'telegraph') {
    e.state = 'attack'; e.until = t + 0.2;
    if (p.state.startsWith('dodge-')) {
      game.message = '¡ESQUIVADO! El rival falló.';
    } else {
      const blocked = p.state === 'block', damage = blocked ? 3 : 16;
      p.hp = Math.max(0, p.hp - damage);
      game.message = blocked ? '¡BLOQUEADO! Daño reducido: −3.' : 'Recibiste un golpe: −16. Usa la señal para defenderte.';
      if (!blocked) { p.state = 'hit'; p.until = t + 0.24; }
      if (!p.hp) { game.result = 'defeat'; p.block = false; return; }
    }
  } else if (e.state === 'attack') {
    e.state = 'recovery'; e.until = t + 0.95;
    game.message = 'Rival recuperándose · oportunidad para golpear.';
  } else {
    e.state = 'idle'; e.until = t + 0.9;
    game.message = 'Rival en guardia. Prepárate para la señal.';
  }
}

// El impacto visual no interrumpe el aviso ni el ciclo de ataque de la IA.
export const enemyPose = game => game.enemy.state === 'defeated' ? 'defeated' :
  game.time < game.enemy.hurtUntil ? 'hit' : game.enemy.state;

function spend(game,amount){game.player.stamina=Math.max(0,game.player.stamina-amount);game.player.regenAt=game.time+0.75;game.stats.spent+=amount;}

export function attackCue(game) {
  if(!game.advanced)return '¡ATENCIÓN! Levanta el puño. Bloquea o esquiva.';
  return `${game.enemy.type==='heavy'?'FUERTE':'RÁPIDO'} desde tu ${game.enemy.side==='left'?'izquierda':'derecha'} · esquiva ${game.enemy.side==='left'?'→ DERECHA':'← IZQUIERDA'} o bloquea.`;
}

function advanceEnemy(game) {
  const e=game.enemy,p=game.player,t=game.time;
  if(e.state==='idle'){e.state='guard';e.until=t+0.45;game.message='El rival cubre su guardia. Observa el próximo movimiento.';return;}
  if(e.state==='guard'){
    e.type=e.turn%2?'heavy':'quick';e.side=e.turn%2?'right':'left';e.turn++;
    e.state='telegraph';e.until=t+(e.type==='heavy'?1.1:0.85);game.message=attackCue(game);return;
  }
  if(e.state==='telegraph'){
    e.state=e.type+'-attack';e.until=t+0.24;
    const dodge=p.state===`dodge-${e.side==='left'?'right':'left'}`;
    if(dodge){game.stats.dodges++;game.stats.useful+=14;game.message='¡ESQUIVADO! Dirección y momento correctos.';return;}
    const perfect=p.state==='block'&&t-p.blockAt<=0.2&&p.stamina>=4;
    if(perfect){spend(game,4);game.stats.useful+=4;game.stats.perfect++;e.state='stunned';e.until=t+1.1;game.message='¡BLOQUEO PERFECTO! Rival desequilibrado: contraataca.';return;}
    const blocked=p.state==='block'&&p.stamina>=12;
    if(blocked){spend(game,12);game.stats.useful+=12;}
    const damage=blocked?3:(e.type==='heavy'?24:16)+(p.state==='heavy'?8:0);
    const suffered=Math.min(p.hp,damage);p.hp-=suffered;game.stats.damage+=suffered;game.shakeUntil=t+0.18;
    game.message=blocked?'¡BLOQUEADO! −3 energía, −12 resistencia.':`¡IMPACTO! −${damage}. ${p.state.startsWith('dodge')?'Esquiva hacia el lado indicado.':'Espera la señal para defenderte.'}`;
    if(!blocked){p.block=false;p.state='hit';p.until=t+0.28;}
    if(!p.hp)game.result='defeat';
  }else if(['quick-attack','heavy-attack','stunned'].includes(e.state)){
    e.state='recovery';e.until=t+0.95;game.message='Rival recuperándose · oportunidad para golpear.';
  }else{e.state='idle';e.until=t+0.8;game.message='Toma aire. El rival prepara otro movimiento.';}
}

// Puntuación provisional, solo en memoria. El tiempo excluye pausas y exploración.
export function combatResult(game) {
  const s=game.stats,efficiency=s.spent?Math.min(100,Math.round(s.useful/s.spent*100)):0;
  return {result:game.result,time:Math.round(game.time*10)/10,hits:s.hits,damage:s.damage,
    dodges:s.dodges,perfect:s.perfect,staminaSpent:s.spent,efficiency,
    score:Math.max(0,Math.round((game.result==='victory'?500:0)+s.hits*20+s.dodges*40+s.perfect*60+efficiency*2-s.damage*3-Math.floor(game.time)*2))};
}
