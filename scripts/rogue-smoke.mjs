import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("qa", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "msedge",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 320, height: 568 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
const checks = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const qa = (callback) => page.evaluate(callback);
const pass = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
const waitPlaying = () =>
  expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.game.state))
    .toBe("playing");

async function offer(kind, id) {
  await page.evaluate(
    ({ kind, id }) => {
      const { game } = globalThis.__JUEGO_QA__;
      game.player.invulnTimer = 1000000;
      game.levelUpSystem.selectOptions = (candidates) => {
        const choice = candidates.find(
          (candidate) =>
            candidate.kind === kind &&
            (!id ||
              candidate.id === id ||
              candidate.weapon?.id === id ||
              candidate.def?.id === id),
        );
        if (!choice) throw new Error(`Unavailable QA offer: ${kind}/${id}`);
        return [
          choice,
          ...candidates.filter((candidate) => candidate !== choice).slice(0, 2),
        ];
      };
      game.levelUpSystem.addLevels(1, game);
    },
    { kind, id },
  );
  await page.getByTestId("upgrade-0").waitFor();
  await page.waitForTimeout(600);
}
async function pickFirst() {
  await page.getByTestId("upgrade-0").tap();
  await waitPlaying();
}
async function assertGeometrySlot(id, name) {
  const slot = page.getByTestId(id);
  await expect(slot).toHaveAttribute("aria-label", new RegExp(name));
  expect(await slot.locator("div").count()).toBeGreaterThan(3);
}

try {
  await page.goto(process.env.QA_URL || "http://localhost:8089");
  await page.getByTestId("start").waitFor({ timeout: 120000 });
  await expect(
    page.getByText("Una forma. Infinitas posibilidades.", { exact: true }),
  ).toBeVisible();
  const start = await page.getByTestId("start").boundingBox();
  expect(start.x).toBeGreaterThanOrEqual(0);
  expect(start.y + start.height).toBeLessThanOrEqual(568);
  expect(
    await qa(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({ path: "qa/rogue-menu-small.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "qa/rogue-menu.png" });
  await page.getByTestId("start").tap();
  await page.getByTestId("timer").waitFor();
  await assertGeometrySlot("slot-weapon:magic_wand", "Aguja vectorial");
  await assertGeometrySlot("slot-dash", "Salto vectorial");
  await assertGeometrySlot("slot-health", "Integridad");
  pass(
    "Compact menu fits 320px, starts a run, and shows drawn geometric identities",
  );

  await offer("weapon-new", "garlic");
  await pickFirst();
  await qa(() => {
    globalThis.__JUEGO_QA__.game.player.weapons.find(
      (weapon) => weapon.id === "garlic",
    ).level = 2;
  });
  await offer("weapon-upgrade", "garlic");
  const garlic = page.getByTestId("upgrade-0");
  await expect(garlic).toContainText("Órbita repulsora");
  await expect(garlic).toContainText("Ralentización");
  await expect(garlic).toContainText("10%");
  await expect(garlic).toContainText("20%");
  await expect(garlic).toContainText("NV. 2 → 3");
  await page.screenshot({ path: "qa/rogue-slow-upgrade.png" });
  await pickFirst();
  await assertGeometrySlot("slot-weapon:garlic", "Órbita repulsora");
  await expect(page.getByTestId("slot-weapon:garlic")).toHaveAttribute(
    "aria-label",
    /3$/,
  );
  pass(
    "Slow upgrade displays the real 10%→20% tactical change and updates the localized inventory",
  );

  await offer("weapon-new", "whip");
  await pickFirst();
  await qa(() => {
    globalThis.__JUEGO_QA__.game.player.weapons.find(
      (weapon) => weapon.id === "whip",
    ).level = 4;
  });
  await offer("weapon-upgrade", "whip");
  await expect(page.getByTestId("upgrade-0")).toContainText("Arco tangente");
  await expect(page.getByTestId("upgrade-0")).toContainText("Ambos lados");
  await expect(page.getByTestId("upgrade-0")).toContainText("No");
  await expect(page.getByTestId("upgrade-0")).toContainText("Sí");
  await expect(page.getByTestId("upgrade-0")).toContainText("NV. 4 → 5");
  await page.screenshot({ path: "qa/rogue-tactical-upgrade.png" });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByTestId("upgrade-0").scrollIntoViewIfNeeded();
  const smallCard = await page.getByTestId("upgrade-0").boundingBox();
  expect(smallCard.x).toBeGreaterThanOrEqual(0);
  expect(smallCard.x + smallCard.width).toBeLessThanOrEqual(320);
  await expect(
    page.getByTestId("upgrade-0").getByText("Ambos lados", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "qa/rogue-tactical-small.png" });
  await pickFirst();
  await page.setViewportSize({ width: 390, height: 844 });
  pass(
    "Both-sides unlock remains visible with all changed stats on phone-sized upgrade cards",
  );

  for (const [id, name] of [
    ["pierce_ray", "Prisma lineal"],
    ["missile", "Delta explosiva"],
  ]) {
    await offer("weapon-new", id);
    await pickFirst();
    await assertGeometrySlot(`slot-weapon:${id}`, name);
  }
  for (const [id, name] of [
    ["tome", "Núcleo circular"],
    ["boots", "Vector de impulso"],
    ["armor", "Coraza hexagonal"],
    ["amulet", "Radio magnético"],
    ["heart", "Ciclo vital"],
  ]) {
    await offer("passive-new", id);
    await pickFirst();
    await assertGeometrySlot(`slot-passive:${id}`, name);
  }
  await qa(() => {
    const { game } = globalThis.__JUEGO_QA__;
    game.player.level = 5;
    game.levelUpSystem.addLevels(1, game);
  });
  await page.getByTestId("upgrade-0").waitFor();
  await page.waitForTimeout(600);
  for (const [index, name] of [
    "Diamante absoluto",
    "Supernova radial",
    "Constelación orbital",
  ].entries()) {
    await expect(page.getByTestId(`upgrade-${index}`)).toContainText(name);
    expect(
      await page.getByTestId(`upgrade-${index}`).locator("div").count(),
    ).toBeGreaterThan(10);
  }
  await page.screenshot({ path: "qa/rogue-ultimates.png" });
  await pickFirst();
  await assertGeometrySlot(
    "slot-ultimate:ult_pierce_shot",
    "Diamante absoluto",
  );
  await qa(() => {
    const { game } = globalThis.__JUEGO_QA__;
    game.player.level = 12;
    game.player.survivalTime = 188;
  });
  await expect(page.getByTestId("timer")).toHaveText("3:08");
  await page.screenshot({ path: "qa/rogue-evolved-build.png" });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: "qa/rogue-tablet-build.png" });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: "qa/rogue-small-build.png" });
  pass(
    "All 15 geometric identities render across the evolved arsenal, utilities, and ultimate choices",
  );

  await page.getByTestId("pause").tap();
  await expect(page.getByText("TU TRAYECTORIA", { exact: true })).toBeVisible();
  await expect(page.getByText("3:08", { exact: true })).toBeVisible();
  await page.screenshot({ path: "qa/rogue-pause-small.png" });
  await page.getByRole("button", { name: "Opciones", exact: true }).tap();
  await page.getByRole("button", { name: "English", exact: true }).tap();
  await page.getByRole("button", { name: "Back", exact: true }).tap();
  await expect(
    page.getByText("YOUR TRAJECTORY", { exact: true }),
  ).toBeVisible();
  await page.getByTestId("resume").tap();
  await assertGeometrySlot("slot-weapon:magic_wand", "Vector Needle");
  await assertGeometrySlot("slot-passive:armor", "Hexagonal Shell");
  pass(
    "Pause summary reflects the run and inventory identities follow the selected language",
  );

  await qa(() => {
    const { game } = globalThis.__JUEGO_QA__;
    game.player.invulnTimer = 0;
    game.player.takeDamage(100000);
  });
  await page.getByTestId("retry").waitFor();
  await expect(
    page.getByText("YOUR TRAJECTORY", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "qa/rogue-game-over.png" });
  await page.getByTestId("retry").tap();
  await waitPlaying();
  expect(await qa(() => globalThis.__JUEGO_QA__.game.player.level)).toBe(1);
  expect(
    await qa(() => globalThis.__JUEGO_QA__.game.player.weapons.length),
  ).toBe(1);
  await assertGeometrySlot("slot-weapon:magic_wand", "Vector Needle");
  pass(
    "Death summary and retry work with a fully evolved build and reset the loadout",
  );
  expect(errors).toEqual([]);
  writeFileSync(
    "qa/rogue-smoke.json",
    JSON.stringify(
      {
        checks,
        errors,
        scope:
          "Edge touch emulation / CanvasKit; seeded test builds; no physical-device validation",
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({ path: "qa/rogue-failure.png" }).catch(() => {});
  console.error(
    JSON.stringify(
      {
        errors,
        text: await page
          .locator("body")
          .innerText()
          .catch(() => ""),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
