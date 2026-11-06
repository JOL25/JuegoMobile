import test from "node:test";
import assert from "node:assert/strict";
import {
  inventoryEntries,
  upgradeDestination,
} from "../src/mobile/visualItems.js";

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
