import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const mode = process.argv.includes("--baseline") ? "baseline" : "optimized";
const scenario = process.argv.includes("--normal") ? "normal" : "stress";
const duration = Number(process.env.PERF_DURATION_MS || 12000);
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "msedge",
  headless: true,
});
let graphics = null;
try {
  const session = await browser.newBrowserCDPSession();
  const { gpu } = await session.send("SystemInfo.getInfo");
  graphics = {
    renderer: gpu.auxAttributes?.glRenderer ?? null,
    vendor: gpu.devices?.[0]?.vendorString ?? null,
    device: gpu.devices?.[0]?.deviceString ?? null,
  };
  await session.detach();
} catch {
  /* Optional browser-only diagnostic. */
}
const reports = [];
const errors = [];
const percentile = (values, p) =>
  values.length
    ? values.slice().sort((a, b) => a - b)[
        Math.min(values.length - 1, Math.floor(values.length * p))
      ]
    : 0;
mkdirSync("qa", { recursive: true });
try {
  const viewports =
    scenario === "normal"
      ? [{ width: 844, height: 390 }]
      : [
          { width: 844, height: 390 },
          { width: 1280, height: 720 },
        ];
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    const baseUrl = process.env.QA_URL || "http://localhost:8087";
    await expect
      .poll(
        () =>
          context.request
            .get(new URL("/status", baseUrl).toString(), { timeout: 2000 })
            .then((response) => response.ok())
            .catch(() => false),
        { timeout: 60000, intervals: [500, 1000, 2000] },
      )
      .toBe(true);
    await page.goto(baseUrl, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.getByTestId("start").waitFor({ timeout: 120000 });
    await page.getByTestId("start").tap();
    await expect
      .poll(() =>
        page.evaluate(
          () => globalThis.__JUEGO_QA__?.game.player.survivalTime ?? 0,
        ),
      )
      .toBeGreaterThan(0.1);
    await page.evaluate((scenario) => {
      const { game } = globalThis.__JUEGO_QA__;
      game.sound.setVolume(0);
      game.player.invulnTimer = 1e9;
      if (scenario === "normal") return;
      game.player.level = 8;
      // Equip through the actual choice application API, using real class tables.
      for (
        let n = 0;
        n < 8 && (game.player.weapons.length < 5 || !game.player.ultimate);
        n++
      ) {
        game.levelUpSystem.selectOptions = (candidates) =>
          candidates.filter((c) => c.kind === "weapon-new").slice(0, 3);
        game.levelUpSystem.addLevels(1, game);
        const choice = game.menu.current.options?.find(
          (c) => c.kind === "weapon-new" || c.kind === "ultimate-new",
        );
        if (!choice) break;
        choice.onPick();
      }
      for (const weapon of game.player.weapons)
        while (weapon.canLevelUp()) weapon.levelUp();
      game.spawner.tick = () => {};
      game.powerUpSpawner.tick = () => {};
      game.enemyPool.forEachActive((e) => game.enemyPool.release(e));
      game.projectilePool.forEachActive((p) => game.projectilePool.release(p));
      game.pickupPool.forEachActive((p) => game.pickupPool.release(p));
      game.particlePool.forEachActive((p) => game.particlePool.release(p));
      const types = game.spawner._availableTypes(600);
      const width = game.canvas.width * 0.84,
        height = game.canvas.height * 0.7;
      for (let i = 0; i < 260; i++) {
        const x = ((i % 26) / 25 - 0.5) * width;
        const y = (Math.floor(i / 26) / 9 - 0.5) * height;
        game._spawnEnemy(types[i % types.length], x, y, 1e6, 0, false);
      }
      for (let i = 0; i < 120; i++)
        game.spawnProjectile({
          x: ((i % 20) / 19 - 0.5) * width,
          y: (Math.floor(i / 20) / 5 - 0.5) * height,
          vx: 0,
          vy: 0,
          damage: 0,
          radius: 4,
          pierce: 999,
          lifespan: 9999,
          color: "#8ee3f5",
          shape: "bolt",
        });
      for (let i = 0; i < 100; i++)
        game.spawnPickup(
          ((i % 20) / 19 - 0.5) * width,
          (Math.floor(i / 20) / 4 - 0.5) * height,
          "heal",
          0,
        );
      for (let i = 0; i < 150; i++) {
        const p = game.particlePool.obtain();
        p.resetSpark(
          ((i % 25) / 24 - 0.5) * width,
          (Math.floor(i / 25) / 5 - 0.5) * height,
          "#e8b13a",
        );
        p.vx = 0;
        p.vy = 0;
        p.life = 9999;
      }
      game.player.magnetRadius = 0;
      game.player.hp = game.player.maxHp;
      game.player.xp = 0;
      game.player.xpToNext = 1e9;
      game.player.invulnTimer = 1e9;
    }, scenario);
    await page.waitForTimeout(1600);
    const result = await page.evaluate(async (duration) => {
      const { game } = globalThis.__JUEGO_QA__;
      const work = [];
      const submitted = [];
      const raf = [];
      const memory = [];
      const original = game.frame;
      game.frame = function (time) {
        const start = performance.now();
        original.call(this, time);
        work.push(performance.now() - start);
        submitted.push(time);
      };
      let stop = false,
        last = null;
      function observe(t) {
        if (stop) return;
        if (last !== null) raf.push(t - last);
        last = t;
        requestAnimationFrame(observe);
      }
      requestAnimationFrame(observe);
      const mem = () => performance.memory?.usedJSHeapSize ?? null;
      memory.push(mem());
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, duration / 3));
        memory.push(mem());
      }
      stop = true;
      game.frame = original;
      return {
        work,
        submitted,
        raf,
        memory,
        metrics: game.renderMetrics ?? null,
        cosmetics: game.renderer.cosmeticStats ?? null,
        sprites: game.ctx.getSpriteCacheStats?.() ?? null,
        counts: {
          enemies: game.enemyPool.activeCount,
          projectiles: game.projectilePool.activeCount,
          pickups: game.pickupPool.activeCount,
          particles: game.particlePool.activeCount,
          weapons: game.player.weapons.length,
        },
        survivalTime: game.player.survivalTime,
        state: game.state,
      };
    }, duration);
    expect(result.state).toBe("playing");
    if (scenario === "stress") expect(result.counts.enemies).toBe(260);
    expect(result.work.length).toBeGreaterThan(0);
    const intervals = result.submitted
      .slice(1)
      .map((t, i) => t - result.submitted[i]);
    const fps = intervals.length
      ? (1000 * intervals.length) / intervals.reduce((a, b) => a + b, 0)
      : 0;
    const report = {
      viewport,
      mode,
      scenario,
      durationMs: duration,
      submittedFps: Number(fps.toFixed(2)),
      frameP50Ms: Number(percentile(intervals, 0.5).toFixed(2)),
      frameP95Ms: Number(percentile(intervals, 0.95).toFixed(2)),
      workP50Ms: Number(percentile(result.work, 0.5).toFixed(2)),
      workP95Ms: Number(percentile(result.work, 0.95).toFixed(2)),
      overBudgetFrames: result.work.filter((t) => t > 16.67).length,
      totalFrames: result.work.length,
      rafP95Ms: Number(percentile(result.raf, 0.95).toFixed(2)),
      memoryBytes: result.memory,
      metrics: result.metrics,
      cosmetics: result.cosmetics,
      sprites: result.sprites,
      memoryMeasurement:
        "Chromium usedJSHeapSize; excludes GPU and other external memory",
      counts: result.counts,
      state: result.state,
    };
    reports.push(report);
    console.log(JSON.stringify(report));
    await page.screenshot({
      path: `qa/performance-${scenario}-${mode}-${viewport.width}.png`,
    });
    await context.close();
  }
  writeFileSync(
    `qa/performance-${scenario === "normal" ? "normal" : mode}.json`,
    JSON.stringify(
      {
        scope:
          scenario === "normal"
            ? "Edge/CanvasKit early normal run with actual automatic spawns. Player invulnerable and audio muted to keep a reproducible sampling window. Submitted JS frames are not measured GPU presentations; physical native devices still required."
            : "Edge/CanvasKit emulation with seeded heavy combat. Submitted JS frames are not measured GPU presentations; physical native devices still required.",
        graphics,
        reports,
        errors,
      },
      null,
      2,
    ),
  );
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
}
