import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("qa", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
await page.goto("http://localhost:8087");
await page.getByTestId("start").waitFor({ timeout: 120000 });
await page.screenshot({ path: "qa/menu.png" });
await page.getByTestId("start").tap();
await page.getByTestId("timer").waitFor();
await page.waitForTimeout(5000);
await page.screenshot({ path: "qa/gameplay.png" });
console.log(
  JSON.stringify(
    {
      errors,
      text: await page.locator("body").innerText(),
      runtime: await page.evaluate(() => {
        const { game } = globalThis.__JUEGO_QA__ ?? {};
        return (
          game && {
            state: game.state,
            hidden: game.pageHidden,
            lastTimestamp: game._lastTimestamp,
            canvas: { width: game.canvas.width, height: game.canvas.height },
            context: game.ctx?.constructor.name,
            time: game.player.survivalTime,
            kills: game.player.kills,
            enemies: game.enemyPool.activeCount,
            elements: [...document.querySelectorAll("canvas")].map((e) => ({
              width: e.width,
              height: e.height,
              rect: e.getBoundingClientRect().toJSON(),
            })),
          }
        );
      }),
    },
    null,
    2,
  ),
);
await browser.close();
if (errors.length) process.exitCode = 1;
