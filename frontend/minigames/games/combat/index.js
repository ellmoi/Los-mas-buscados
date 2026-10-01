import {header} from '../../../js/components/ui.js';
import {createCombat, act, update, attackCue, combatResult} from './model.js';
import {render} from './draw.js';
import {createGameLoop} from '../../index.js';

export function combatPage({advanced=false,embedded=false,sharedCanvas=false,protectedAnimal='dog'}={}) {
  return `${embedded?'':header(advanced?'Minijuegos · combate V2':'Minijuegos · prototipo 01', 'Proteger al animal', 'Combate frontal · pixel art · sin violencia gráfica')}
  <section data-minigame="combat" ${advanced?'data-advanced':''} aria-label="Prototipo de combate frontal">
    <div class="combat-machine">
      <div class="combat-title">LOS MÁS BUSCADOS <span>MISIÓN: PROTEGER AL ${protectedAnimal==='cat'?'GATO':'PERRO'}</span></div>
      <div class="combat-hud">
        <div><label for="combat-player-hp">TU ENERGÍA <span data-player-value>100</span></label><progress id="combat-player-hp" max="100" value="100"></progress></div>
        <div><label for="combat-enemy-hp">${advanced?'DETERMINACIÓN':'RIVAL'} <span data-enemy-value>100</span></label><progress id="combat-enemy-hp" max="100" value="100"></progress></div>
        ${advanced?'<div class="combat-stamina"><label for="combat-stamina">TU RESISTENCIA <span data-stamina-value>100</span></label><progress id="combat-stamina" max="100" value="100"></progress></div>':''}
      </div>
      <div class="combat-stage">
        ${sharedCanvas?'<div data-combat-canvas></div>':'<canvas width="384" height="288" tabindex="0" aria-label="Combate en primera persona. Rival de frente y tus manos en primer plano." aria-describedby="combat-help">Tu navegador necesita Canvas 2D. Las barras y los avisos del combate se muestran también como texto.</canvas>'}
        <div class="combat-overlay" data-overlay>
          <h2 data-result-title>DA UN PASO AL FRENTE</h2>
          <p data-result-copy>Observa su puño: avisa antes de atacar. Defiéndete y aprovecha su recuperación.</p>
          ${advanced?'<p class="combat-summary" data-combat-summary role="status" aria-live="polite" hidden></p>':''}
          <button type="button" class="button" data-start>Comenzar combate</button>
          <button type="button" class="button secondary" data-continue hidden>Continuar</button>
        </div>
      </div>
      <p class="combat-feedback" data-feedback role="status" aria-live="polite" aria-atomic="true">Pulsa Comenzar combate cuando estés listo.</p>
    </div>
    <div class="combat-controls" aria-label="Controles del combate">
      <button type="button" class="button secondary" data-action="dodge-left" disabled>← Esquivar <small>A / ←</small></button>
      <button type="button" class="button secondary" data-action="block" disabled>Bloquear <small>Mantén Espacio o el botón</small></button>
      <button type="button" class="button" data-action="punch" disabled>${advanced?'Golpe rápido':'Golpear'} <small>J / X${advanced?' · 8 resistencia':''}</small></button>
      ${advanced?'<button type="button" class="button" data-action="heavy" disabled>Golpe fuerte <small>K / C · 24 resistencia</small></button>':''}
      <button type="button" class="button secondary" data-action="dodge-right" disabled>Esquivar → <small>D / →</small></button>
    </div>
    <div class="combat-tools"><button type="button" class="button secondary" data-pause disabled>Pausar</button><button type="button" class="button secondary" data-restart>Reiniciar pelea</button>${embedded?'<button type="button" class="button ghost" data-return>Volver al mapa</button>':'<a class="button ghost" href="#/minijuegos">Volver a Minijuegos</a>'}</div>
    <p id="combat-help" class="combat-help">J / X: golpear · Espacio: mantener la guardia · A / ← y D / →: esquivar.
    El bloqueo reduce el daño; un esquive a tiempo lo evita. Golpea durante la recuperación para hacer más daño.
    ${advanced?'K / C: golpe fuerte (más lento y te deja expuesto). Esquiva hacia la flecha indicada. Bloquea en los últimos 0,2 s para desequilibrar al rival. Baja el ritmo para recuperar resistencia.':'Sin puntuaciones ni progreso guardado.'}
    Los controles funcionan al enfocar el juego. Al salir de él o cambiar de pestaña, se pausa.</p>
  </section>`;
}

export function mount(container,{advanced=false,onReturn,session,protectedAnimal='dog',canvas:sharedCanvas,loop:sharedLoop}={}) {
  const area = container.querySelector('[data-minigame="combat"]');
  const canvas = sharedCanvas||area.querySelector('canvas'), ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador no permite usar Canvas 2D.');
  if(sharedCanvas){
    area.querySelector('[data-combat-canvas]').replaceWith(canvas);
    canvas.setAttribute('aria-label','Combate en primera persona. Rival de frente y tus manos en primer plano.');
    canvas.setAttribute('aria-describedby','combat-help');
  }
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet'; stylesheet.href = new URL('./combat.css', import.meta.url).href;
  document.head.append(stylesheet);
  const events = new AbortController(), options = {signal: events.signal};
  const get = selector => area.querySelector(selector);
  const overlay = get('[data-overlay]'), title = get('[data-result-title]'), copy = get('[data-result-copy]');
  const start = get('[data-start]'), next = get('[data-continue]'), pauseButton = get('[data-pause]');
  const feedback = get('[data-feedback]'), controls = [...area.querySelectorAll('[data-action]')];
  const playerBar = get('#combat-player-hp'), enemyBar = get('#combat-enemy-hp');
  const playerValue = get('[data-player-value]'), enemyValue = get('[data-enemy-value]');
  const newCombat=()=>createCombat({advanced,protectedAnimal});
  let game = session?.combat||newCombat(), running = false, disposed = false;
  const loop=sharedLoop||createGameLoop(tick);loop.setStep(tick);
  if(session)session.combat=game;
  let lastMessage = '', lastPlayer = -1, lastEnemy = -1;
  let lastStamina=-1;
  const staminaBar=advanced?get('#combat-stamina'):null,staminaValue=advanced?get('[data-stamina-value]'):null;
  const summary=advanced?get('[data-combat-summary]'):null;
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
  const paint=()=>render(ctx,game,{reducedMotion});
  const blockSources = new Set();
  let tapBlockUntil = 0;

  function sync() {
    const stamina=Math.floor(game.player.stamina);
    if(advanced&&stamina!==lastStamina){lastStamina=stamina;staminaBar.value=stamina;staminaValue.textContent=stamina;}
    if (game.player.hp !== lastPlayer) { lastPlayer = game.player.hp; playerBar.value = lastPlayer; playerValue.textContent = lastPlayer; }
    if (game.enemy.hp !== lastEnemy) { lastEnemy = game.enemy.hp; enemyBar.value = lastEnemy; enemyValue.textContent = lastEnemy; }
    if (game.message !== lastMessage) { lastMessage = game.message; feedback.textContent = lastMessage; }
  }
  function enable(active) { controls.forEach(button => { button.disabled = !active; }); pauseButton.disabled = !active; }
  function stop() {
    running = false;
    loop.stop();blockSources.clear(); tapBlockUntil = 0;
    act(game, 'release'); enable(false);
  }
  function finish() {
    if(session)session.mode='result';
    stop(); overlay.hidden = false; next.hidden = !onReturn && game.result !== 'victory';
    if(onReturn)next.textContent=session?'Continuar':'Volver al mapa';
    if(summary){const r=combatResult(game);summary.hidden=false;summary.textContent=`Puntuación: ${r.score} · ${r.time} s · ${r.hits} golpes acertados · ${r.damage} daño recibido · ${r.dodges} esquives correctos · ${r.perfect} bloqueos perfectos · eficiencia: ${r.efficiency}% (${r.staminaSpent} resistencia usada).`;}
    title.textContent = game.result === 'victory' ? 'PROTEGISTE AL ANIMAL' : 'NO PUDISTE DETENERLO ESTA VEZ';
    copy.textContent = game.result === 'victory' ? 'El agresor se ha rendido.' : 'Observa la señal y prueba a defenderte antes de responder.';
    start.textContent = game.result === 'victory' ? 'Volver a intentar' : 'Intentar de nuevo';
    start.focus({preventScroll: true});
  }
  function tick(dt) {
    if (!running || disposed) return;
    if (!blockSources.size && game.time >= tapBlockUntil) act(game, 'release');
    update(game, dt); paint(); sync();
    if (game.result) finish();
  }
  function begin(reset = false) {
    if(disposed||document.hidden)return;
    stop();
    if (reset || game.result) {game = newCombat();if(session)session.combat=game;}
    if(session)session.mode='combat';
    if(summary)summary.hidden=true;
    game.message = game.enemy.state === 'telegraph'
      ? attackCue(game)
      : 'Combate en marcha. Observa al rival.';
    running = true; overlay.hidden = true; next.hidden = true; enable(true);
    canvas.focus({preventScroll: true}); sync(); paint();
    loop.start();
  }
  function pause() {
    if (!running) return;
    stop(); title.textContent = 'COMBATE EN PAUSA'; copy.textContent = 'Respira. La pelea continuará cuando estés listo.';
    start.textContent = 'Reanudar combate'; next.hidden = true; overlay.hidden = false;
    game.message = 'En pausa. Pulsa Reanudar combate.'; sync(); paint();
  }
  const keyboardActions = {KeyA: 'dodge-left', ArrowLeft: 'dodge-left', KeyD: 'dodge-right', ArrowRight: 'dodge-right', KeyJ: 'punch', KeyX: 'punch', Space: 'block'};
  if(advanced)Object.assign(keyboardActions,{KeyK:'heavy',KeyC:'heavy'});
  area.addEventListener('keydown', event => {
    if (!running || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input, textarea, select, a, [contenteditable="true"]')) return;
    const action = keyboardActions[event.code];
    // Espacio conserva la activación nativa de Pausar/Reiniciar.
    if (!action || (event.code === 'Space' && event.target.closest('button:not([data-action])'))) return;
    event.preventDefault();
    if (event.repeat) return;
    if (action === 'block') blockSources.add('keyboard');
    else { blockSources.clear(); tapBlockUntil = 0; }
    act(game, action);
  }, options);
  window.addEventListener('keyup', event => {
    if (event.code === 'Space') { blockSources.delete('keyboard'); if (!blockSources.size) act(game, 'release'); }
  }, options);
  controls.forEach(button => {
    const action = button.dataset.action;
    button.addEventListener('pointerdown', event => {
      if (!running || event.button !== 0) return;
      event.preventDefault(); canvas.focus({preventScroll: true});
      button.setPointerCapture(event.pointerId);
      if (action === 'block') blockSources.add(event.pointerId);
      else { blockSources.clear(); tapBlockUntil = 0; }
      act(game, action);
    }, options);
    const release = event => {
      blockSources.delete(event.pointerId);
      if (!blockSources.size) act(game, 'release');
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release, options);
    // Activación accesible por Enter/tecnología de asistencia, sin duplicar el pointerdown.
    button.addEventListener('click', event => {
      if (!running || event.detail !== 0) return;
      if (action === 'block') tapBlockUntil = game.time + 0.65;
      act(game, action);
    }, options);
  });
  start.addEventListener('click', () => begin(), options);
  get('[data-restart]').addEventListener('click', () => begin(true), options);
  pauseButton.addEventListener('click', () => { pause(); start.focus({preventScroll: true}); }, options);
  next.addEventListener('click', () => { if(onReturn){onReturn(combatResult(game));return;}copy.textContent = 'El resto de la historia se implementará próximamente.'; next.hidden = true; start.focus({preventScroll: true}); }, options);
  if(onReturn)get('[data-return]').addEventListener('click',()=>{stop();onReturn(combatResult(game));},options);
  window.addEventListener('blur', pause, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, options);
  area.addEventListener('focusout', event => { if (!area.contains(event.relatedTarget)) pause(); }, options);
  // Un modal de la aplicación nunca debe dejar la pelea corriendo detrás.
  const modalRoot = document.querySelector('#modal-root');
  const observer = new MutationObserver(() => { if (modalRoot?.childElementCount) pause(); });
  if (modalRoot) observer.observe(modalRoot, {childList: true});
  paint();
  return () => { disposed = true; stop(); events.abort(); observer.disconnect(); stylesheet.remove(); };
}
