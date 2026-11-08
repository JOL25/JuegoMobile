import test from "node:test";
import assert from "node:assert/strict";
import { FramePacer, FrameMonitor } from "../src/mobile/performance.js";

test("drawing targets 60 Hz on a 120 Hz display", () => {
  const pacer = new FramePacer(60);
  let draws = 0;
  for (let i = 0; i < 120; i++) if (pacer.shouldDraw((i * 1000) / 120)) draws++;
  assert.equal(draws, 60);
});
test("rounded 60 Hz timestamps do not halve the drawing rate and resets discard stale deadlines", () => {
  const pacer = new FramePacer(60);
  let draws = 0;
  for (let i = 0; i < 120; i++)
    if (pacer.shouldDraw(Math.round(((i * 1000) / 60) * 10) / 10)) draws++;
  assert.equal(draws, 120);
  assert.equal(pacer.shouldDraw(10000), true);
  pacer.reset();
  assert.equal(pacer.shouldDraw(10001), true);
});
test("rolling frame telemetry remains bounded and measures submitted frame intervals", () => {
  const monitor = new FrameMonitor(4);
  for (let i = 0; i < 100; i++) monitor.record((i * 1000) / 60, i % 2 ? 5 : 7);
  const snapshot = monitor.snapshot("test");
  assert.equal(snapshot.samples, 4);
  assert.equal(snapshot.frames, 100);
  assert.equal(snapshot.fps, 60);
  assert.equal(snapshot.workP95Ms, 7);
  assert.equal(snapshot.perFrameReactUpdates, 0);
  monitor.reset();
  assert.equal(monitor.snapshot("test").samples, 0);
});
