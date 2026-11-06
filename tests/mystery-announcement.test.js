import test from 'node:test';
import assert from 'node:assert/strict';
import { PowerUpSpawner } from '../src/game/systems/PowerUpSpawner.js';
import { announcementText } from '../src/mobile/announcements.js';
import { setLanguage } from '../src/game/ui/i18n.js';
setLanguage('es');

test('el cartel aparece con los beneficios a los 2 minutos y no se repite al reaparecer', () => {
  const spawner = new PowerUpSpawner();
  const spawned = [];
  const tick = (time) => spawner.tick(time, () => false, (...args) => spawned.push(args));
  tick(119.99);
  assert.equal(spawner.announcementAge, null);
  assert.equal(spawned.length, 0);
  tick(120);
  assert.equal(spawner.announcementAge, 0);
  assert.equal(spawned.length, 3);
  tick(122);
  assert.equal(spawner.announcementAge, 2);
  tick(124);
  assert.equal(spawner.announcementAge, null);
  tick(210);
  assert.equal(spawner.announcementAge, null);
  spawner.reset();
  assert.equal(spawner.announcementAge, null);
  tick(120);
  assert.equal(spawner.announcementAge, 0);
});

test('el cartel nativo muestra el mensaje misterioso completo', () => {
  assert.equal(announcementText({ powerUpSpawner: { announcementAge: 1 } }), 'Han aparecido beneficios misteriosos en el mapa');
  assert.equal(announcementText({ powerUpSpawner: { announcementAge: null }, spawner: { announcement: { type: { plural: 'Triángulos' } } } }), 'HAN EMERGIDO LOS Triángulos');
  assert.equal(announcementText({ powerUpSpawner: { announcementAge: null }, spawner: { announcement: null } }), '');
});
