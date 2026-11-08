import { chromium, expect } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

mkdirSync("qa", { recursive: true });
const config = JSON.parse(
  readFileSync("app.json", "utf8").replace(/^\uFEFF/, ""),
);
expect(config.expo.orientation).toBe("landscape");
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "msedge",
  headless: true,
});
const checks = [
  "Native application configuration requests landscape orientation",
];
const errors = [];
const layouts = [];
const url = process.env.QA_URL || "http://localhost:8087";
const pass = (message) => {
  checks.push(message);
  console.log(`PASS ${message}`);
};
const center = (box) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});
async function inside(locator, viewport) {
  await expect(locator).toBeVisible();
  const r = await locator.boundingBox();
  expect(r).not.toBeNull();
  expect(r.x).toBeGreaterThanOrEqual(-1);
  expect(r.y).toBeGreaterThanOrEqual(-1);
  expect(r.x + r.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(r.y + r.height).toBeLessThanOrEqual(viewport.height + 1);
  const clip = await locator.evaluate((element) => {
    let left = 0,
      top = 0,
      right = window.innerWidth,
      bottom = window.innerHeight;
    for (
      let parent = element.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      const style = getComputedStyle(parent),
        rect = parent.getBoundingClientRect();
      if (/(hidden|clip|scroll|auto)/.test(style.overflowX)) {
        left = Math.max(left, rect.left);
        right = Math.min(right, rect.right);
      }
      if (/(hidden|clip|scroll|auto)/.test(style.overflowY)) {
        top = Math.max(top, rect.top);
        bottom = Math.min(bottom, rect.bottom);
      }
    }
    return { left, top, right, bottom };
  });
  expect(r.x, "left edge is not clipped by an ancestor").toBeGreaterThanOrEqual(
    clip.left - 1,
  );
  expect(r.y, "top edge is not clipped by an ancestor").toBeGreaterThanOrEqual(
    clip.top - 1,
  );
  expect(
    r.x + r.width,
    "right edge is not clipped by an ancestor",
  ).toBeLessThanOrEqual(clip.right + 1);
  expect(
    r.y + r.height,
    "bottom edge is not clipped by an ancestor",
  ).toBeLessThanOrEqual(clip.bottom + 1);
  return r;
}
async function actionWithMovement(
  page,
  context,
  action,
  actionFirst,
  simultaneous = false,
) {
  const qa = (fn) => page.evaluate(fn);
  await page.evaluate((action) => {
    const { game, input } = globalThis.__JUEGO_QA__;
    input.reset();
    game.player.invulnTimer = 100000;
    if (action === "dash") {
      game.player.dashCharges = 1;
      game.player.dashActive = 0;
    } else {
      game.player.ultimate.cooldownTimer = 0;
      game.player.ultimate.active = false;
    }
  }, action);
  const button = page.getByTestId(action);
  await expect(button).not.toHaveAttribute("aria-disabled", "true");
  const zone = await page.getByTestId("joystick-zone").boundingBox();
  const actionFinger = {
    ...center(await button.boundingBox()),
    id: actionFirst ? 1 : 2,
  };
  const stick = {
    x: zone.x + Math.min(65, zone.width * 0.25),
    y: zone.y + zone.height - 60,
    id: actionFirst ? 2 : 1,
  };
  const moved = { ...stick, x: stick.x + 45, y: stick.y - 10 };
  const cdp = await context.newCDPSession(page);
  try {
    if (simultaneous) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: actionFirst
          ? [actionFinger, stick]
          : [stick, actionFinger],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: actionFirst
          ? [actionFinger, moved]
          : [moved, actionFinger],
      });
    } else if (actionFirst) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [actionFinger],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [actionFinger, stick],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [actionFinger, moved],
      });
    } else {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [stick],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [moved],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [moved, actionFinger],
      });
    }
    await expect
      .poll(() => qa(() => globalThis.__JUEGO_QA__.input.getMoveVector().x))
      .toBeGreaterThan(0.1);
    if (action === "dash")
      await expect
        .poll(() => qa(() => globalThis.__JUEGO_QA__.game.player.dashCharges))
        .toBe(0);
    else
      await expect
        .poll(() =>
          qa(() => globalThis.__JUEGO_QA__.game.player.ultimate.cooldownTimer),
        )
        .toBeGreaterThan(0);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [actionFinger],
    });
    expect(
      await qa(() => globalThis.__JUEGO_QA__.input.getMoveVector().x),
    ).toBeGreaterThan(0);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => qa(() => globalThis.__JUEGO_QA__.input.getMoveVector().x))
      .toBe(0);
  } finally {
    await cdp
      .send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
      .catch(() => {});
    await cdp.detach();
  }
}
try {
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 568, height: 320 },
    { width: 1280, height: 720 },
  ]) {
    const label = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({
      viewport,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const qa = (fn) => page.evaluate(fn);
    page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`${label}: ${m.text()}`);
    });
    try {
      await page.goto(url);
      await page.getByTestId("start").waitFor({ timeout: 120000 });
      await inside(page.getByTestId("start"), viewport);
      await inside(
        page.getByRole("button", { name: "Opciones", exact: true }),
        viewport,
      );
      await page.screenshot({ path: `qa/landscape-menu-${label}.png` });
      pass(`${label}: landscape menu actions are available without scrolling`);
      await page.getByRole("button", { name: "Opciones", exact: true }).tap();
      await inside(
        page.getByRole("button", { name: "English", exact: true }),
        viewport,
      );
      await inside(
        page.getByRole("button", { name: "30%", exact: true }),
        viewport,
      );
      await page.getByRole("button", { name: "English", exact: true }).tap();
      await expect(page.getByText("Options", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "30%", exact: true }).tap();
      await expect(page.getByText("Sound: 30%", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Español", exact: true }).tap();
      await inside(
        page.getByRole("button", { name: "Volver", exact: true }),
        viewport,
      );
      await page.getByRole("button", { name: "Volver", exact: true }).tap();
      pass(`${label}: options, translation and volume are usable horizontally`);
      await page.getByTestId("start").tap();
      await expect
        .poll(() => qa(() => globalThis.__JUEGO_QA__.game.player.survivalTime))
        .toBeGreaterThan(0.1);
      await qa(() => {
        globalThis.__JUEGO_QA__.game.player.invulnTimer = 100000;
      });
      const world = await qa(() => ({
        width: globalThis.__JUEGO_QA__.game.canvas.width,
        height: globalThis.__JUEGO_QA__.game.canvas.height,
      }));
      expect(world.width).toBeGreaterThan(world.height);
      expect(
        Math.abs(world.width / world.height - viewport.width / viewport.height),
      ).toBeLessThan(0.01);
      for (const id of ["pause", "dash", "ultimate"])
        await inside(page.getByTestId(id), viewport);
      const banner = page.getByTestId("encounter-banner");
      await banner.waitFor();
      await inside(banner, viewport);
      await expect(banner).toContainText("Triángulos");
      const layering = await page.evaluate(() => {
        const notice = document.querySelector(
          '[data-testid="encounter-banner"]',
        );
        const health = document.querySelector('[data-testid="health-panel"]');
        if (!notice || !health)
          throw new Error("Missing banner or health-panel test target");
        const z = (el) => {
          let v = 0;
          while (el) {
            const n = Number(getComputedStyle(el).zIndex);
            if (Number.isFinite(n)) v = Math.max(v, n);
            el = el.parentElement;
          }
          return v;
        };
        const r = notice.getBoundingClientRect(),
          hit = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
        return {
          noticeZ: z(notice),
          healthZ: z(health),
          pointerEvents: getComputedStyle(notice).pointerEvents,
          blocksTouch: !!hit && (hit === notice || notice.contains(hit)),
        };
      });
      expect(layering.noticeZ).toBeGreaterThan(layering.healthZ);
      expect(layering.pointerEvents).toBe("none");
      expect(layering.blocksTouch).toBe(false);
      await page.screenshot({ path: `qa/landscape-announcement-${label}.png` });
      await qa(() => {
        globalThis.__JUEGO_QA__.game.spawner.announcements[0].age = 3.84;
      });
      await expect(banner).toHaveCount(0, { timeout: 5000 });
      pass(
        `${label}: announcement renders in front of health, passes touches through and expires`,
      );
      await qa(() => {
        const { game } = globalThis.__JUEGO_QA__;
        game.player.level = 5;
        game.levelUpSystem.addLevels(1, game);
      });
      await page.getByTestId("upgrade-0").tap();
      await expect
        .poll(() => qa(() => !!globalThis.__JUEGO_QA__.game.player.ultimate))
        .toBe(true);
      await expect
        .poll(() => qa(() => globalThis.__JUEGO_QA__.game.state))
        .toBe("playing");
      if (viewport.width === 844) {
        for (const action of ["dash", "ultimate"])
          for (const first of [false, true]) {
            await actionWithMovement(page, context, action, first);
            pass(
              `${label}: ${action.toUpperCase()} ${first ? "before" : "after"} joystick preserves movement`,
            );
          }
        for (const action of ["dash", "ultimate"])
          for (const first of [false, true]) {
            await actionWithMovement(page, context, action, first, true);
            pass(
              `${label}: ${action.toUpperCase()} and joystick start simultaneously (${first ? "action" : "joystick"} first in batch)`,
            );
          }
      } else await actionWithMovement(page, context, "dash", false);
      await page.screenshot({ path: `qa/landscape-gameplay-${label}.png` });
      if (viewport.width === 844) {
        await qa(() => {
          const { game } = globalThis.__JUEGO_QA__;
          game.enemyPool.forEachActive((enemy) =>
            game.enemyPool.release(enemy),
          );
          game.projectilePool.forEachActive((shot) =>
            game.projectilePool.release(shot),
          );
          game.player.weapons.forEach((weapon) => {
            weapon.cooldownTimer = 100000;
          });
          const types = game.spawner._availableTypes(420);
          types.forEach((type, index) =>
            game._spawnEnemy(
              type,
              game.player.x + (index - 2) * 110,
              game.player.y - 80,
              10000,
              0,
              false,
            ),
          );
          game._spawnEnemy(
            types[1],
            game.player.x - 110,
            game.player.y + 75,
            10000,
            0,
            true,
          );
          game._spawnEnemy(
            types[4],
            game.player.x + 110,
            game.player.y + 75,
            10000,
            0,
            true,
          );
        });
        await page.waitForTimeout(150);
        await page.screenshot({ path: "qa/landscape-sprites-844x390.png" });
        await qa(() => {
          globalThis.__JUEGO_QA__.game.enemyFreezeTimer = 10;
        });
        await page.waitForTimeout(150);
        await page.screenshot({
          path: "qa/landscape-sprites-frozen-844x390.png",
        });
        await qa(() => {
          const { game } = globalThis.__JUEGO_QA__;
          game.enemyFreezeTimer = 0;
          game.player.weapons.forEach((weapon) => {
            weapon.cooldownTimer = 0;
          });
        });
        pass(
          "844x390: seeded gallery captures all five enemy shapes, elite outlines and frozen variants around the circular hero",
        );
      }

      await qa(() => {
        const { game } = globalThis.__JUEGO_QA__;
        game.player.level = 7;
        let whip = game.player.weapons.find((w) => w.id === "whip");
        if (!whip) {
          const old = game.levelUpSystem.selectOptions;
          game.levelUpSystem.selectOptions = (candidates) => candidates;
          const selected = game.levelUpSystem
            .buildOptions(game.player)
            .find((o) => o.kind === "weapon-new" && o.id === "whip");
          game.levelUpSystem.selectOptions = old;
          if (!selected)
            throw new Error("Missing real whip acquisition candidate");
          game.levelUpSystem.pendingLevelUps = 1;
          game.levelUpSystem.applyChoice(selected, game);
          whip = game.player.weapons.find((w) => w.id === "whip");
        }
        while (whip.level < 4) whip.levelUp();
        game.levelUpSystem.selectOptions = (candidates) => {
          const desired = candidates.find(
            (o) => o.kind === "weapon-upgrade" && o.weapon.id === "whip",
          );
          return [
            desired,
            ...candidates.filter((o) => o !== desired).slice(0, 2),
          ];
        };
        game.levelUpSystem.addLevels(1, game);
      });
      await page.getByTestId("upgrade-0").waitFor();
      await page.waitForTimeout(650);
      const cards = [];
      for (let i = 0; i < 3; i++)
        cards.push(await inside(page.getByTestId(`upgrade-${i}`), viewport));
      expect(
        Math.max(...cards.map((r) => r.y)) - Math.min(...cards.map((r) => r.y)),
      ).toBeLessThan(3);
      expect(cards[1].x).toBeGreaterThan(cards[0].x + cards[0].width - 1);
      expect(cards[2].x).toBeGreaterThan(cards[1].x + cards[1].width - 1);
      await expect(page.getByTestId("upgrade-0")).toContainText("Ambos lados");
      await expect(page.getByTestId("upgrade-0")).toContainText("Sí");
      await page.screenshot({ path: `qa/landscape-upgrades-${label}.png` });
      layouts.push({ viewport, cards });
      await page.getByTestId("upgrade-0").tap();
      await expect
        .poll(() =>
          qa(
            () =>
              globalThis.__JUEGO_QA__.game.player.weapons.find(
                (w) => w.id === "whip",
              ).level,
          ),
        )
        .toBe(5);
      pass(
        `${label}: all three choices fit one row and retain tactical effects`,
      );
      await page.getByTestId("pause").tap();
      for (const locator of [
        page.getByTestId("resume"),
        page.getByRole("button", { name: "Opciones", exact: true }),
        page.getByRole("button", { name: "Reiniciar", exact: true }),
      ])
        await inside(locator, viewport);
      await page.screenshot({ path: `qa/landscape-pause-${label}.png` });
      await page.getByTestId("resume").tap();
      await qa(() => {
        const { game } = globalThis.__JUEGO_QA__;
        game.player.invulnTimer = 0;
        game.player.takeDamage(100000);
      });
      await inside(page.getByTestId("retry"), viewport);
      await page.screenshot({ path: `qa/landscape-game-over-${label}.png` });
      await page.getByTestId("retry").tap();
      await expect
        .poll(() => qa(() => globalThis.__JUEGO_QA__.game.state))
        .toBe("playing");
      expect(await qa(() => globalThis.__JUEGO_QA__.game.player.level)).toBe(1);
      pass(`${label}: pause, defeat and retry fit the landscape viewport`);
    } catch (e) {
      await page
        .screenshot({ path: `qa/landscape-failure-${label}.png` })
        .catch(() => {});
      console.error(
        JSON.stringify(
          {
            viewport,
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
      throw e;
    } finally {
      await context.close();
    }
  }
  expect(errors).toEqual([]);
  writeFileSync(
    "qa/landscape-smoke.json",
    JSON.stringify(
      {
        checks,
        errors,
        layouts,
        scope:
          "Edge touch emulation / CanvasKit and native orientation configuration; seeded tactical choices; no physical-device or native FPS validation",
      },
      null,
      2,
    ),
  );
  console.log(
    `Passed ${checks.length} landscape checks without browser errors.`,
  );
} finally {
  await browser.close();
}
