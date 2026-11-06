import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("qa", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "msedge",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
const checks = [];
const record = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
const qa = (callback) => page.evaluate(callback);
try {
  await page.goto(process.env.QA_URL || "http://localhost:8087");
  await page.getByTestId("start").waitFor({ timeout: 120000 });
  await page.screenshot({ path: "qa/menu.png" });
  await page.getByTestId("start").tap();
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.game.player.survivalTime))
    .toBeGreaterThan(0.2);
  record("Start advances the native engine and draws the Skia world");

  const cdp = await context.newCDPSession(page);
  const finger = { x: 80, y: 650, id: 1 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [finger],
  });
  const moved = { x: 130, y: 610, id: 1 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [moved],
  });
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.input.getMoveVector().x))
    .toBeGreaterThan(0.1);
  const startX = await qa(() => globalThis.__JUEGO_QA__.game.player.x);
  const dash = await page.getByTestId("dash").boundingBox();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      moved,
      { x: dash.x + dash.width / 2, y: dash.y + dash.height / 2, id: 2 },
    ],
  });
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.game.player.dashCharges))
    .toBe(0);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [
      { x: dash.x + dash.width / 2, y: dash.y + dash.height / 2, id: 2 },
    ],
  });
  expect(
    await qa(() => globalThis.__JUEGO_QA__.input.getMoveVector().x),
  ).toBeGreaterThan(0);
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.game.player.x))
    .toBeGreaterThan(startX + 30);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.input.getMoveVector().x))
    .toBe(0);
  record(
    "Two real protocol fingers move and DASH together; releasing DASH preserves movement",
  );
  await page.screenshot({ path: "qa/gameplay.png" });

  await page.getByTestId("pause").tap();
  await page.getByTestId("resume").waitFor();
  const elapsed = await qa(
    () => globalThis.__JUEGO_QA__.game.player.survivalTime,
  );
  await page.waitForTimeout(300);
  expect(await qa(() => globalThis.__JUEGO_QA__.game.player.survivalTime)).toBe(
    elapsed,
  );
  await page.getByRole("button", { name: "Opciones", exact: true }).tap();
  await page.getByRole("button", { name: "English", exact: true }).tap();
  await expect(page.getByText("Options", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "30%", exact: true }).tap();
  await page.getByRole("button", { name: "Back", exact: true }).tap();
  await page.getByTestId("resume").tap();
  record("Pause freezes simulation; language and volume options work");

  await qa(() => globalThis.__JUEGO_QA__.game.onXpCollected(30));
  await page.getByTestId("upgrade-0").waitFor();
  await page.screenshot({ path: "qa/upgrades.png" });
  await page.getByTestId("upgrade-0").tap();
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.game.state))
    .toBe("playing");
  await qa(() => {
    const { game } = globalThis.__JUEGO_QA__;
    game.player.level = 5;
    game.levelUpSystem.addLevels(1, game);
  });
  await page.getByTestId("upgrade-0").tap();
  await expect
    .poll(() => qa(() => !!globalThis.__JUEGO_QA__.game.player.ultimate))
    .toBe(true);
  await page.getByTestId("ultimate").tap();
  await expect
    .poll(() =>
      qa(() => globalThis.__JUEGO_QA__.game.player.ultimate.cooldownTimer),
    )
    .toBeGreaterThan(0);
  record("Native upgrade choices and level-five ultimate activation work");

  await qa(() => {
    const { game } = globalThis.__JUEGO_QA__;
    game.suspend();
    game.resume();
  });
  await page.getByTestId("resume").waitFor();
  expect(await qa(() => globalThis.__JUEGO_QA__.game.state)).toBe("paused");
  await page.getByTestId("resume").tap();
  await qa(() => {
    const { game } = globalThis.__JUEGO_QA__;
    game.player.invulnTimer = 0;
    game.player.takeDamage(100000);
  });
  await page.getByTestId("retry").waitFor();
  await page.screenshot({ path: "qa/game-over.png" });
  await expect
    .poll(() => qa(() => localStorage.getItem("@JuegoMobile/v1")))
    .toContain("vs_clone_best_time");
  await page.reload();
  await page.getByTestId("start").waitFor();
  await expect(page.getByText("BEST", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Options", exact: true }).tap();
  await expect(page.getByText("Sound: 30%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).tap();
  record(
    "App interruption keeps the game paused; score, language and volume survive reload",
  );

  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByTestId("start").scrollIntoViewIfNeeded();
  await page.getByTestId("start").tap();
  await expect(page.getByTestId("dash")).toBeVisible();
  await page.screenshot({ path: "qa/small-phone.png" });
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect
    .poll(() => qa(() => globalThis.__JUEGO_QA__.game.canvas.width))
    .toBe(540);
  await page.screenshot({ path: "qa/tablet.png" });
  record("Small phone and tablet layouts keep controls available");

  expect(errors).toEqual([]);
  writeFileSync(
    "qa/mobile-smoke.json",
    JSON.stringify(
      {
        checks,
        errors,
        scope:
          "Edge mobile emulation with CanvasKit; physical devices still required",
      },
      null,
      2,
    ),
  );
  console.log(
    `Passed ${checks.length} mobile flow checks without browser errors.`,
  );
} catch (error) {
  console.log(
    JSON.stringify(
      {
        errors,
        body: await page.locator("body").innerText(),
        input: await qa(() => {
          const { game, input } = globalThis.__JUEGO_QA__;
          return {
            state: game.state,
            input: { move: input.move, actions: [...input.actions] },
            ultimate: game.player.ultimate && {
              id: game.player.ultimate.id,
              cooldown: game.player.ultimate.cooldownTimer,
              active: game.player.ultimate.active,
            },
          };
        }),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
