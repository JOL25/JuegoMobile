import test from "node:test";
import assert from "node:assert/strict";
import {
  inventoryEntries,
  upgradeDestination,
  upgradeDisplay,
  ITEM_IDS,
  itemLook,
  itemName,
} from "../src/mobile/visualItems.js";

import { setLanguage } from "../src/game/ui/i18n.js";
import {
  createWeapon,
  createUltimate,
  PASSIVE_DEFS,
} from "../src/game/weapons/registry.js";
import { DASH } from "../src/game/config.js";

test("every progression kind targets the appropriate inventory object", () => {
  assert.equal(
    upgradeDestination({ kind: "weapon-new", id: "whip" }),
    "weapon:whip",
  );
  assert.equal(
    upgradeDestination({ kind: "weapon-upgrade", weapon: { id: "whip" } }),
    "weapon:whip",
  );
  assert.equal(
    upgradeDestination({ kind: "passive-new", def: { id: "armor" } }),
    "passive:armor",
  );
  assert.equal(
    upgradeDestination({ kind: "passive-upgrade", def: { id: "armor" } }),
    "passive:armor",
  );
  assert.equal(
    upgradeDestination({ kind: "ultimate-new", id: "ult_wave" }),
    "ultimate:ult_wave",
  );
  assert.equal(
    upgradeDestination({ kind: "ultimate-upgrade", id: "ult_wave" }),
    "ultimate:ult_wave",
  );
  assert.equal(upgradeDestination({ kind: "dash-upgrade" }), "dash");
  assert.equal(upgradeDestination({ kind: "heal" }), "health");
});
test("preview creates only missing destinations and never changes the player inventory", () => {
  const player = {
    weapons: [{ id: "whip", name: "Whip", level: 2 }],
    passives: [],
    ultimate: null,
    hp: 50,
    dashLevel: 1,
  };
  const initial = JSON.stringify(player);
  const owned = inventoryEntries(player, {
    kind: "weapon-upgrade",
    weapon: player.weapons[0],
  });
  assert.equal(owned.filter((e) => e.key === "weapon:whip").length, 1);
  const pending = inventoryEntries(player, {
    kind: "weapon-new",
    id: "missile",
    title: "Missile",
  });
  assert.equal(pending.find((e) => e.key === "weapon:missile").preview, true);
  assert.equal(JSON.stringify(player), initial);
});

test("weapon upgrade metadata uses the actual current and next combat tables", () => {
  setLanguage("es");
  const weapon = createWeapon("magic_wand");
  weapon.level = 2;
  const display = upgradeDisplay({ kind: "weapon-upgrade", weapon });
  assert.equal(display.name, "Aguja vectorial");
  assert.deepEqual(
    [display.level, display.nextLevel, display.maxLevel, display.isNew],
    [2, 3, 8, false],
  );
  assert.deepEqual(
    display.stats.find((stat) => stat.label === "Daño"),
    { label: "Daño", before: "14", after: "18" },
  );
  assert.deepEqual(
    display.stats.find((stat) => stat.label === "Recarga"),
    { label: "Recarga", before: "0.85 s", after: "0.8 s" },
  );
  assert.deepEqual(
    display.stats.find((stat) => stat.label === "Proyectiles"),
    { label: "Proyectiles", before: "1", after: "2" },
  );
  assert.equal(
    display.stats.some((stat) => stat.label === "Perforación"),
    false,
    "unchanged attributes should not be presented as improvements",
  );
  assert.equal(weapon.level, 2, "displaying a choice must not apply it");
});

test("new weapons show level-one values and slow percentages retain their actual units", () => {
  setLanguage("es");
  const missile = upgradeDisplay({ kind: "weapon-new", id: "missile" });
  assert.deepEqual(
    [missile.level, missile.nextLevel, missile.maxLevel, missile.isNew],
    [0, 1, 8, true],
  );
  assert.deepEqual(
    missile.stats.find((stat) => stat.label === "Daño"),
    { label: "Daño", after: "36" },
  );
  assert.deepEqual(
    missile.stats.find((stat) => stat.label === "Recarga"),
    { label: "Recarga", after: "10 s" },
  );
  const orbit = createWeapon("garlic");
  orbit.level = 2;
  const slow = upgradeDisplay({ kind: "weapon-upgrade", weapon: orbit });
  assert.deepEqual(
    slow.stats.find((stat) => stat.label === "Ralentización"),
    { label: "Ralentización", before: "10%", after: "20%" },
  );
});

test("passive display derives percentages and healing from the actual definitions", () => {
  setLanguage("es");
  const tome = PASSIVE_DEFS.find((def) => def.id === "tome");
  const display = upgradeDisplay({
    kind: "passive-upgrade",
    def: tome,
    instance: { id: "tome", level: 2 },
  });
  assert.deepEqual(
    [display.level, display.nextLevel, display.maxLevel],
    [2, 3, 5],
  );
  assert.deepEqual(display.stats, [
    { label: "Vida máxima", before: "+20%", after: "+30%" },
  ]);
  const heart = PASSIVE_DEFS.find((def) => def.id === "heart");
  const cycle = upgradeDisplay({
    kind: "passive-upgrade",
    def: heart,
    instance: { id: "heart", level: 1 },
  });
  assert.deepEqual(
    cycle.stats.find((stat) => stat.label === "Vida al matar"),
    { label: "Vida al matar", before: "+5", after: "+10" },
  );
  assert.deepEqual(
    cycle.stats.find((stat) => stat.label === "Recarga"),
    { label: "Recarga", after: "5 s" },
  );
});

test("a new ultimate previews the selected geometry even when another ultimate is owned", () => {
  setLanguage("es");
  const owned = createUltimate("ult_wave");
  owned.level = 5;
  const display = upgradeDisplay(
    {
      kind: "ultimate-new",
      id: "ult_pierce_shot",
      title: "Súper disparo perforante",
    },
    { ultimate: owned },
  );
  assert.equal(display.id, "ult_pierce_shot");
  assert.equal(display.name, "Diamante absoluto");
  assert.deepEqual(
    [display.level, display.nextLevel, display.maxLevel, display.isNew],
    [0, 1, 5, true],
  );
  assert.deepEqual(
    display.stats.find((stat) => stat.label === "Daño"),
    { label: "Daño", after: "90" },
  );
  assert.deepEqual(
    display.stats.find((stat) => stat.label === "Recarga"),
    { label: "Recarga", after: "12 s" },
  );
  assert.equal(owned.level, 5);
});

test("ultimate upgrades use the matching owned level and safely ignore another owned ultimate", () => {
  setLanguage("es");
  const wave = createUltimate("ult_wave");
  wave.level = 3;
  const same = upgradeDisplay(
    { kind: "ultimate-upgrade", id: "ult_wave", title: "Onda → Lv.4" },
    { ultimate: wave },
  );
  assert.deepEqual([same.level, same.nextLevel, same.maxLevel], [3, 4, 5]);
  assert.deepEqual(
    same.stats.find((stat) => stat.label === "Daño"),
    { label: "Daño", before: "88", after: "108" },
  );
  wave.level = 5;
  const other = upgradeDisplay(
    {
      kind: "ultimate-upgrade",
      id: "ult_pierce_shot",
      title: "Diamante → Lv.3",
    },
    { ultimate: wave },
  );
  assert.deepEqual([other.level, other.nextLevel], [2, 3]);
  assert.deepEqual(
    other.stats.find((stat) => stat.label === "Daño"),
    { label: "Daño", before: "110", after: "130" },
  );
});

test("dash preview follows real charge and distance configuration in both languages", () => {
  for (const lang of ["es", "en"]) {
    setLanguage(lang);
    const display = upgradeDisplay(
      { kind: "dash-upgrade", title: "Dash → Lv.3/4" },
      { dashLevel: 2 },
    );
    assert.deepEqual(
      [display.level, display.nextLevel, display.maxLevel],
      [2, 3, DASH.maxLevel],
    );
    assert.deepEqual(display.stats[0], {
      label: lang === "es" ? "Cargas" : "Charges",
      before: String(DASH.baseCharges + 1),
      after: String(DASH.baseCharges + 2),
    });
    assert.deepEqual(display.stats[1], {
      label: lang === "es" ? "Alcance" : "Range",
      before: DASH.baseDistanceCm + DASH.rangePerUpgradeCm + " cm",
      after: DASH.baseDistanceCm + DASH.rangePerUpgradeCm * 2 + " cm",
    });
  }
  setLanguage("es");
});

test("all item identities have localized geometry families and effect descriptions", () => {
  assert.equal(ITEM_IDS.length, 15);
  const esNames = new Set();
  const enNames = new Set();
  for (const id of ITEM_IDS) {
    const es = itemLook(id, "es");
    const en = itemLook(id, "en");
    assert.ok(
      es.name &&
        en.name &&
        es.family &&
        en.family &&
        es.effectHook &&
        en.effectHook,
    );
    assert.ok(
      es.shape && es.color && en.shape === es.shape && en.color === es.color,
    );
    esNames.add(es.name);
    enNames.add(en.name);
  }
  assert.equal(esNames.size, ITEM_IDS.length);
  assert.equal(enNames.size, ITEM_IDS.length);
  assert.equal(itemName("magic_wand", "es"), "Aguja vectorial");
  assert.equal(itemName("magic_wand", "en"), "Vector Needle");
  setLanguage("en");
  assert.equal(itemName("magic_wand"), "Vector Needle");
  setLanguage("es");
});
