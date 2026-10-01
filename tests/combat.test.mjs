import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCombat, act, update, enemyPose} from '../frontend/minigames/games/combat/model.js';

function advance(game, seconds) { for (let t = 0; t < seconds; t += 0.01) update(game, 0.01); }
function until(game, predicate) {
  for (let n = 0; n < 1000 && !predicate(); n++) update(game, 0.01);
  assert.ok(predicate(), 'El estado esperado debe ser alcanzable');
}

test('Combate: golpe diferido, cooldown, impacto visual y oportunidad de recuperación', () => {
  const game = createCombat();
  assert.equal(act(game, 'punch'), true);
  assert.equal(game.enemy.hp, 100);
  assert.equal(act(game, 'punch'), false);
  advance(game, 0.16);
  assert.equal(game.enemy.hp, 90);
  assert.equal(enemyPose(game), 'hit');
  advance(game, 0.2);
  assert.equal(act(game, 'punch'), false);
  until(game, () => game.enemy.state === 'recovery');
  act(game, 'punch'); advance(game, 0.16);
  assert.equal(game.enemy.hp, 72);
});

test('Combate: aviso legible, ataque, daño y recuperación del rival', () => {
  const game = createCombat();
  until(game, () => game.enemy.state === 'telegraph');
  advance(game, 0.7);
  assert.equal(game.enemy.state, 'telegraph'); assert.equal(game.player.hp, 100);
  until(game, () => game.enemy.state === 'attack');
  assert.equal(game.player.hp, 84); assert.equal(game.player.state, 'hit');
  until(game, () => game.enemy.state === 'recovery');
  until(game, () => game.enemy.state === 'idle');
});

test('Combate: bloquear reduce daño y soltar elimina la guardia', () => {
  const game = createCombat();
  act(game, 'block'); until(game, () => game.enemy.state === 'attack');
  assert.equal(game.player.hp, 97); assert.match(game.message, /BLOQUEADO/);
  act(game, 'release'); assert.equal(game.player.state, 'idle');
  until(game, () => game.enemy.state === 'telegraph');
  until(game, () => game.enemy.state === 'attack'); assert.equal(game.player.hp, 81);
});

for (const direction of ['dodge-left', 'dodge-right']) {
  test(`Combate: ${direction} evita el impacto a tiempo, pero no demasiado pronto`, () => {
    const game = createCombat();
    until(game, () => game.enemy.state === 'telegraph'); advance(game, 0.65);
    act(game, direction); until(game, () => game.enemy.state === 'attack');
    assert.equal(game.player.hp, 100); assert.match(game.message, /ESQUIVADO/);
    until(game, () => game.enemy.state === 'telegraph'); act(game, direction);
    until(game, () => game.enemy.state === 'attack'); assert.equal(game.player.hp, 84);
  });
}

test('Combate: victoria y derrota detienen las reglas; nueva partida restaura ambos HP', () => {
  const winner = createCombat();
  for (let n = 0; n < 2000 && !winner.result; n++) { act(winner, 'punch'); update(winner, 0.01); }
  assert.equal(winner.result, 'victory'); assert.equal(winner.enemy.hp, 0);
  assert.equal(enemyPose(winner), 'defeated');
  const loser = createCombat();
  for (let n = 0; n < 4000 && !loser.result; n++) update(loser, 0.01);
  assert.equal(loser.result, 'defeat'); assert.equal(loser.player.hp, 0);
  for (const game of [winner, loser]) {
    const before = structuredClone(game);
    assert.equal(act(game, 'punch'), false); advance(game, 5); assert.deepEqual(game, before);
  }
  const fresh = createCombat();
  assert.equal(fresh.player.hp, 100); assert.equal(fresh.enemy.hp, 100); assert.equal(fresh.result, null);
});
