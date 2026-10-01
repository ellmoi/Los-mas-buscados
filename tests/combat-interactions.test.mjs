import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mount} from '../frontend/minigames/games/combat/index.js';
import {loadMinigame} from '../frontend/minigames/index.js';

// Dobles del DOM/RAF: prueban los controles reales y la limpieza, no el layout.
function setup(t,mountOptions={}) {
  const saved = Object.fromEntries(['window', 'document', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, globalThis[key]]));
  const listeners = new Set(), frames = new Map(), styles = new Set();
  function node() {
    return {
      hidden: false, disabled: false, textContent: '', dataset: {},
      addEventListener(type, callback, {signal} = {}) {
        const entry = {target: this, type, callback}; listeners.add(entry);
        signal?.addEventListener('abort', () => listeners.delete(entry), {once: true});
      },
      fire(type, values = {}) {
        const event = {target: this, button: 0, detail: 0, preventDefault() {}, ...values};
        for (const entry of [...listeners]) if (entry.target === this && entry.type === type) entry.callback(event);
      },
      focus() {}, closest() { return null; }, setPointerCapture() {}, remove() { styles.delete(this); },
    };
  }
  const selectors = ['canvas', '[data-overlay]', '[data-result-title]', '[data-result-copy]', '[data-start]', '[data-continue]', '[data-pause]', '[data-restart]', '[data-feedback]', '#combat-player-hp', '#combat-enemy-hp', '[data-player-value]', '[data-enemy-value]'];
  if(mountOptions.advanced)selectors.push('#combat-stamina','[data-stamina-value]','[data-combat-summary]','[data-return]');
  const nodes = Object.fromEntries(selectors.map(key => [key, node()]));
  const controls = ['dodge-left', 'block', 'punch', 'dodge-right',...(mountOptions.advanced?['heavy']:[])].map(action => Object.assign(node(), {dataset: {action}}));
  const ctx = Object.fromEntries(['fillRect', 'fillText', 'save', 'restore', 'translate', 'scale', 'strokeRect'].map(key => [key, () => {}]));
  nodes.canvas.getContext = () => ctx;
  const area = Object.assign(node(), {querySelector: key => nodes[key], querySelectorAll: () => controls, contains: target => Object.values(nodes).includes(target) || controls.includes(target)});
  const win = node(), doc = Object.assign(node(), {head: {append: link => styles.add(link)}, createElement: node, querySelector: () => null});
  let nextId = 0, now = 0;
  Object.assign(globalThis, {window: win, document: doc,
    MutationObserver: class {observe() {} disconnect() {}},
    requestAnimationFrame: callback => { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  t.after(() => Object.assign(globalThis, saved));
  const dispose = mount({querySelector: () => area},mountOptions);
  t.after(dispose);
  function step(count = 1) {
    for (let i = 0; i < count; i++) {
      now += 10; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
    }
  }
  return {nodes, controls, area, win, doc, frames, listeners, styles, dispose, step,
    key: code => area.fire('keydown', {code}),
    start: () => nodes['[data-start]'].fire('click'),
    restart: () => nodes['[data-restart]'].fire('click'),
    pointer: (action, type = 'pointerdown') => controls.find(b => b.dataset.action === action).fire(type, {pointerId: 1}),
  };
}

test('Combate: teclado, botones, HUD, pausa y limpieza sin duplicar listeners al reiniciar', t => {
  const ui = setup(t), count = ui.listeners.size;
  assert.equal(ui.frames.size, 0);
  ui.start(); ui.key('KeyJ'); ui.step(18);
  assert.equal(ui.nodes['#combat-enemy-hp'].value, 90);
  for (const code of ['KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight']) {
    ui.restart(); ui.key(code); ui.step();
    assert.match(ui.nodes['[data-feedback]'].textContent, /Esquive/);
  }
  for (const action of ['dodge-left', 'dodge-right']) {
    ui.restart(); ui.pointer(action); ui.step();
    assert.match(ui.nodes['[data-feedback]'].textContent, /Esquive/);
  }
  ui.restart(); ui.key('Space'); ui.step(220);
  assert.equal(ui.nodes['#combat-player-hp'].value, 97);
  ui.win.fire('keyup', {code: 'Space'}); ui.step(300);
  assert.equal(ui.nodes['#combat-player-hp'].value, 81);
  ui.restart(); ui.pointer('block'); ui.step(220);
  assert.equal(ui.nodes['#combat-player-hp'].value, 97);
  ui.pointer('block', 'pointercancel'); ui.step(300);
  assert.equal(ui.nodes['#combat-player-hp'].value, 81);
  ui.restart(); ui.pointer('punch'); ui.step(18);
  assert.equal(ui.nodes['#combat-enemy-hp'].value, 90);
  ui.controls.find(b => b.dataset.action === 'punch').fire('click', {detail: 1});
  ui.step(45); assert.equal(ui.nodes['#combat-enemy-hp'].value, 90);
  ui.controls.find(b => b.dataset.action === 'punch').fire('click'); ui.step(18);
  assert.equal(ui.nodes['#combat-enemy-hp'].value, 80);
  ui.win.fire('blur'); assert.equal(ui.frames.size, 0);
  assert.match(ui.nodes['[data-result-title]'].textContent, /PAUSA/);
  ui.start(); assert.equal(ui.frames.size, 1);
  assert.doesNotMatch(ui.nodes['[data-feedback]'].textContent, /En pausa/);
  ui.doc.hidden = true; ui.doc.fire('visibilitychange'); assert.equal(ui.frames.size, 0);
  ui.doc.hidden = false;
  for (let i = 0; i < 5; i++) ui.restart();
  assert.equal(ui.listeners.size, count); assert.equal(ui.frames.size, 1);
  ui.area.fire('focusout', {relatedTarget: null}); assert.equal(ui.frames.size, 0);
  ui.dispose(); assert.equal(ui.listeners.size, 0); assert.equal(ui.styles.size, 0); assert.equal(ui.frames.size, 0);
});

test('V2: controles fuertes, barra de resistencia, resultados y devolución al mapa',t=>{
  let returned;
  const ui=setup(t,{advanced:true,onReturn:r=>{returned=r;ui.dispose();}});
  ui.start();ui.key('KeyK');ui.step(50);
  assert.equal(ui.nodes['#combat-enemy-hp'].value,74);assert.equal(ui.nodes['#combat-stamina'].value,76);
  ui.restart();ui.pointer('heavy');ui.step(50);assert.equal(ui.nodes['#combat-enemy-hp'].value,74);
  ui.restart();ui.step(4000);assert.equal(ui.nodes['#combat-player-hp'].value,0);
  assert.match(ui.nodes['[data-combat-summary]'].textContent,/Puntuación/);
  assert.equal(ui.nodes['[data-continue]'].hidden,false);
  ui.nodes['[data-continue]'].fire('click');assert.equal(returned.result,'defeat');assert.ok(returned.damage>=100);
  assert.equal(ui.frames.size,0);assert.equal(ui.listeners.size,0);
});

test('Combate: finales, continuar y reinicio dejan una sola animación o ninguna', t => {
  const ui = setup(t); ui.start();
  for (let i = 0; i < 30 && ui.frames.size; i++) { ui.key('KeyX'); ui.step(56); }
  assert.match(ui.nodes['[data-result-title]'].textContent, /PROTEGISTE/);
  assert.equal(ui.nodes['#combat-enemy-hp'].value, 0); assert.equal(ui.frames.size, 0);
  assert.equal(ui.nodes['[data-continue]'].hidden, false);
  ui.nodes['[data-continue]'].fire('click');
  assert.match(ui.nodes['[data-result-copy]'].textContent, /próximamente/);
  ui.start(); assert.equal(ui.nodes['#combat-player-hp'].value, 100); assert.equal(ui.nodes['#combat-enemy-hp'].value, 100);
  ui.step(3000);
  assert.match(ui.nodes['[data-result-title]'].textContent, /NO PUDISTE/);
  assert.equal(ui.nodes['#combat-player-hp'].value, 0); assert.equal(ui.frames.size, 0);
  assert.equal(ui.nodes['[data-continue]'].hidden, true);
  ui.restart(); assert.equal(ui.frames.size, 1); ui.dispose(); assert.equal(ui.frames.size, 0);
});

test('Minijuegos: una sola tarjeta sin spoilers y el enlace antiguo abre el mismo juego', async () => {
  const catalog = await loadMinigame('/minijuegos');
  assert.match(catalog.html, /href="#\/minijuegos\/rescate">Jugar/);
  assert.equal((catalog.html.match(/<section /g)||[]).length,1);
  assert.doesNotMatch(catalog.html,/Proteger al animal|combate|gato|perro/i);
  const game = await loadMinigame('/minijuegos/rescate'),legacy=await loadMinigame('/minijuegos/combat');
  assert.equal(game.mount,legacy.mount);assert.equal(game.html,legacy.html);
  assert.match(game.html, /data-rescue/);
});
