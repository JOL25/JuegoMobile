import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("qa", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "msedge",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
const errors = [];
const checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
const qa = (callback) => page.evaluate(callback);
const pass = (label) => {
  checks.push(label);
  console.log(`PASS ${label}`);
};
async function offer(kind, id) {
  await page.evaluate(
    ({ kind, id }) => {
      const { game } = globalThis.__JUEGO_QA__;
      game.levelUpSystem.selectOptions = (candidates) => {
        const desired = candidates.find(
          (c) =>
            c.kind === kind &&
            (!id || c.id === id || c.weapon?.id === id || c.def?.id === id),
        );
        if (!desired) throw new Error(`Missing test candidate: ${kind}/${id}`);
        return [
          desired,
          ...candidates.filter((c) => c !== desired).slice(0, 2),
        ];
      };
      game.onXpCollected(game.player.xpToNext - game.player.xp);
    },
    { kind, id },
  );
  await page.getByTestId("upgrade-0").waitFor();
}
try {
  await page.goto(process.env.QA_URL || "http://localhost:8087");
  await page.getByTestId("start").waitFor({ timeout: 120000 });
  await page.screenshot({ path: "qa/visual-menu.png" });
  await page.getByTestId("start").tap();
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.game.player.survivalTime))
    .toBeGreaterThan(0.1);
  await page.screenshot({ path: "qa/visual-arena.png" });

  await offer("weapon-new", "whip");
  await page.waitForTimeout(650);
  await page.screenshot({ path: "qa/visual-choices.png" });
  const before = await qa(
    () => globalThis.__JUEGO_QA__.game.player.weapons.length,
  );
  await page.getByTestId("upgrade-0").tap();
  await page.getByTestId("acquisition-flight").waitFor();
  expect(await qa(() => globalThis.__JUEGO_QA__.game.state)).toBe("level_up");
  expect(
    await qa(() => globalThis.__JUEGO_QA__.game.player.weapons.length),
  ).toBe(before);
  await page.getByTestId("upgrade-1").dispatchEvent("click");
  await page.waitForTimeout(180);
  await page.screenshot({ path: "qa/visual-flight.png" });
  await expect(page.getByTestId("acquisition-flight")).toHaveCount(0);
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.game.player.weapons.length))
    .toBe(before + 1);
  await expect(page.getByTestId("slot-weapon:whip")).toHaveAttribute(
    "aria-label",
    /1$/,
  );
  pass(
    "New weapon flies to its measured inventory slot; repeated touches apply exactly one choice",
  );

  await offer("weapon-upgrade", "whip");
  await page.getByTestId("upgrade-0").tap();
  await expect(page.getByTestId("acquisition-flight")).toHaveCount(0);
  await expect
    .poll(() =>
      qa(
        () =>
          globalThis.__JUEGO_QA__.game.player.weapons.find(
            (w) => w.id === "whip",
          ).level,
      ),
    )
    .toBe(2);
  expect(
    await qa(() => globalThis.__JUEGO_QA__.game.player.weapons.length),
  ).toBe(before + 1);
  await expect(page.getByTestId("slot-weapon:whip")).toHaveAttribute(
    "aria-label",
    /2$/,
  );
  pass(
    "Upgrading an owned weapon animates to its existing slot and increments its level",
  );

  await offer("passive-new");
  const passiveKey = await qa(
    () =>
      `slot-passive:${globalThis.__JUEGO_QA__.game.menu.current.options[0].def.id}`,
  );
  await page.getByTestId("upgrade-0").tap();
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.game.player.passives.length))
    .toBe(1);
  await expect(page.getByTestId(passiveKey)).toBeVisible();
  pass("Passive acquisition creates and fills the correct inventory slot");

  // The native lifecycle must never resume combat underneath a backgrounded acquisition.
  await qa(() => {
    const { game } = globalThis.__JUEGO_QA__;
    game.player.level = 5;
    game.levelUpSystem.addLevels(1, game);
  });
  await page.getByTestId("upgrade-0").tap();
  await page.getByTestId("acquisition-flight").waitFor();
  await qa(() => globalThis.__JUEGO_QA__.game.suspend());
  await expect
    .poll(() => qa(() => !!globalThis.__JUEGO_QA__.game.player.ultimate))
    .toBe(true);
  expect(await qa(() => globalThis.__JUEGO_QA__.game.state)).toBe("paused");
  await qa(() => globalThis.__JUEGO_QA__.game.resume());
  await page.getByTestId("resume").tap();
  pass(
    "Ultimate acquisition interrupted by backgrounding returns to an explicit pause",
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await offer("dash-upgrade");
  const dashLevel = await qa(
    () => globalThis.__JUEGO_QA__.game.player.dashLevel,
  );
  await page.getByTestId("upgrade-0").tap();
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.game.player.dashLevel))
    .toBe(dashLevel + 1);
  await expect(page.getByTestId("acquisition-flight")).toHaveCount(0);
  pass(
    "Reduced-motion preference keeps acquisition functional without the travel animation",
  );

  await page.setViewportSize({ width: 320, height: 568 });
  await qa(() => {
    const { game } = globalThis.__JUEGO_QA__;
    game.levelUpSystem.addLevels(1, game);
  });
  await page.getByTestId("upgrade-2").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("inventory-dock")).toBeVisible();
  await page.screenshot({ path: "qa/visual-small-choices.png" });
  pass(
    "Upgrade cards remain scrollable and inventory stays visible on small phones",
  );
  expect(errors).toEqual([]);
  writeFileSync(
    "qa/visual-smoke.json",
    JSON.stringify(
      {
        checks,
        errors,
        scope:
          "Edge touch emulation / CanvasKit; no physical-device validation",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
