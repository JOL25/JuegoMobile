import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, STATE } from '../src/game/core/Game.js';
import { TouchInput } from '../src/mobile/TouchInput.js';
import { MenuBridge } from '../src/mobile/MenuBridge.js';
import { WorldRenderer } from '../src/game/rendering/WorldRenderer.js';
import { setLanguage } from '../src/game/ui/i18n.js';

function makeGame(renderer = { render() {} }) {
  const input = new TouchInput();
  const menu = new MenuBridge();
  const sound = { unlock() {}, play() {}, stopAll() {}, setSuspended() {} };
  return new Game({ getContext: () => null }, { input, menu, sound, renderer });
}

test('movement survives an unrelated finger lifting; DASH and ULT are independent', () => {
  const input = new TouchInput();
  assert.equal(input.begin(7, 30, 40), true);
  assert.equal(input.begin(9, 100, 100), false);
  input.drag(7, 100, 110);
  assert.ok(Math.abs(Math.hypot(...Object.values(input.getMoveVector())) - 1) < 0.001);
  input.queueDash(); input.queueUltimate(); input.end(9);
  assert.ok(input.getMoveVector().x > 0);
  assert.equal(input.consumeDash(), true); assert.equal(input.consumeDash(), false);
  assert.equal(input.consumeUltimate(), true);
  input.end(7); assert.deepEqual(input.getMoveVector(), { x: 0, y: 0 });
});

test('native engine simulates combat, upgrades and death without browser globals', () => {
  assert.equal(typeof document, 'undefined');
  assert.equal(typeof window, 'undefined');
  setLanguage('es');
  const game = makeGame();
  assert.equal(game.menu.current.screen, 'menu');
  game.start(); game.frame(0);
  game.input.begin(1, 0, 0); game.input.drag(1, 48, 0);
  for (let i = 1; i <= 180; i++) game.frame(i * 1000 / 60);
  assert.ok(game.player.x > 0); assert.ok(game.enemyPool.activeCount + game.player.kills > 0);
  game.input.queueDash(); game.frame(181 * 1000 / 60);
  assert.equal(game.player.dashCharges, game.player.dashMaxCharges - 1);
  game.onXpCollected(10000);
  assert.equal(game.state, STATE.LEVEL_UP);
  let choices = 0;
  while (game.state === STATE.LEVEL_UP && choices++ < 100) game.menu.current.options[0].onPick();
  assert.equal(game.state, STATE.PLAYING); assert.ok(game.player.ultimate);
  game.player.hp = 0; game.player.alive = false;
  game.frame(182 * 1000 / 60);
  assert.equal(game.state, STATE.GAME_OVER); assert.equal(game.menu.current.screen, 'game_over');
  game.start(); assert.equal(game.player.level, 1); assert.equal(game.player.kills, 0);
});

test('background pauses simulation, clears touches and does not advance on resume', () => {
  const game = makeGame(); game.start(); game.frame(0); game.frame(100);
  game.input.begin(1, 0, 0); game.input.drag(1, 40, 0); game.input.queueDash();
  game.suspend(); const elapsed = game.player.survivalTime;
  game.frame(50000); assert.equal(game.player.survivalTime, elapsed);
  assert.equal(game.menu.current.screen, 'paused');
  assert.deepEqual(game.input.getMoveVector(), { x: 0, y: 0 });
  assert.equal(game.input.consumeDash(), false);
  game.resume(); game.frame(90000); assert.equal(game.state, STATE.PAUSED);
  game.togglePause(); game.frame(90016); assert.ok(game.player.survivalTime - elapsed < 0.05);
});

test('background during an upgrade keeps the choice and stops simulation', () => {
  const game = makeGame(); game.start(); game.onXpCollected(30);
  const options = game.menu.current.options;
  game.suspend(); game.resume();
  assert.equal(game.state, STATE.LEVEL_UP); assert.equal(game.menu.current.options, options);
  options[0].onPick(); assert.equal(game.state, STATE.PLAYING);
});

test('world rendering uses only the supported native drawing operations', () => {
  const calls = [];
  const methods = new Set(['save','restore','scale','translate','rotate','beginPath','closePath','moveTo','lineTo','arc','ellipse','fill','stroke','fillRect','strokeRect','fillText','drawPixelSprite']);
  const context = new Proxy({}, { get(target, key) {
    if (key in target) return target[key];
    if (methods.has(key)) return (...args) => calls.push([key, args]);
    throw new Error(`Unsupported native context method: ${String(key)}`);
  }, set(target, key, value) { target[key] = value; return true; } });
  const game = makeGame(new WorldRenderer()); game.ctx = context; game.start();
  game.spawnPickup(40, 40, 'heal', 30);
  for (let i = 0; i < 120; i++) game.frame(i * 1000 / 60);
  assert.ok(calls.some(([key]) => key === 'drawPixelSprite'));
  assert.ok(calls.some(([key]) => key === 'ellipse'));
});
