import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTION_LAYOUT,
  actionAtPoint,
  actionMetrics,
} from "../src/mobile/touchLayout.js";

const insets = { left: 0, top: 0, right: 0, bottom: 0 };

test("DASH and ULT hit areas match the bottom-right action layout", () => {
  const metrics = actionMetrics({
    width: 844,
    height: 390,
    insets,
    landscape: true,
  });

  assert.equal(metrics.dash.right, 844 - ACTION_LAYOUT.margin.landscape);
  assert.equal(metrics.dash.bottom, 390 - ACTION_LAYOUT.bottom.landscape);
  assert.equal(metrics.dash.left, metrics.dash.right - ACTION_LAYOUT.dashSize);
  assert.equal(metrics.dash.top, metrics.dash.bottom - ACTION_LAYOUT.dashSize);

  assert.equal(metrics.ultimate.right, metrics.dash.left - ACTION_LAYOUT.gap);
  assert.equal(
    metrics.ultimate.left,
    metrics.ultimate.right - ACTION_LAYOUT.ultimateSize,
  );
  assert.equal(
    metrics.ultimate.bottom,
    metrics.dash.bottom,
    "the smaller ULT button stays bottom-aligned",
  );
});

test("action hit-testing recognises each button and rejects the gap", () => {
  const metrics = actionMetrics({
    width: 844,
    height: 390,
    insets,
    landscape: true,
  });
  const center = (area) => ({
    x: (area.left + area.right) / 2,
    y: (area.top + area.bottom) / 2,
  });

  assert.equal(
    actionAtPoint(center(metrics.dash).x, center(metrics.dash).y, metrics),
    "dash",
  );
  assert.equal(
    actionAtPoint(
      center(metrics.ultimate).x,
      center(metrics.ultimate).y,
      metrics,
    ),
    "ultimate",
  );

  const gapX = (metrics.ultimate.right + metrics.dash.left) / 2;
  assert.equal(actionAtPoint(gapX, metrics.dash.bottom - 10, metrics), null);
  assert.equal(
    actionAtPoint(100, 300, metrics),
    null,
    "joystick area is not an action",
  );
});

test("hit areas respect safe-area insets and portrait margins", () => {
  const metrics = actionMetrics({
    width: 390,
    height: 844,
    insets: { left: 21, top: 47, right: 21, bottom: 34 },
    landscape: false,
  });

  assert.equal(metrics.dash.right, 390 - 21 - ACTION_LAYOUT.margin.portrait);
  assert.equal(metrics.dash.bottom, 844 - 34 - ACTION_LAYOUT.bottom.portrait);
  assert.equal(
    metrics.ultimate.left,
    metrics.dash.left - ACTION_LAYOUT.gap - ACTION_LAYOUT.ultimateSize,
  );
});

test("the joystick boundary never overlaps the action buttons", () => {
  for (const viewport of [
    { width: 568, height: 320, landscape: true },
    { width: 844, height: 390, landscape: true },
    { width: 1280, height: 720, landscape: true },
    { width: 390, height: 844, landscape: false },
  ]) {
    const metrics = actionMetrics({ ...viewport, insets });
    assert.ok(metrics.ultimate.left > 0);
    assert.ok(metrics.dash.left > metrics.ultimate.left);
    assert.ok(metrics.dash.right <= viewport.width);
    assert.ok(metrics.dash.bottom <= viewport.height);
  }
});
