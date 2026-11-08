// Shared action-button geometry for touch hit-testing.
//
// Android dispatches every pointer of a gesture to the native view under the
// FIRST finger (`JSTouchDispatcher`), so a second finger on DASH/ULT never
// reaches the Pressable while the joystick owns the gesture. The screen-level
// touch handler therefore has to recognise the action buttons by coordinates
// too. Keep these numbers in sync with the styles in GameScreen.

export const ACTION_LAYOUT = {
  dashSize: 82,
  ultimateSize: 70,
  gap: 12,
  margin: { landscape: 14, portrait: 20 },
  bottom: { landscape: 12, portrait: 24 },
};

export function actionMetrics({ width, height, insets, landscape }) {
  const margin = landscape
    ? ACTION_LAYOUT.margin.landscape
    : ACTION_LAYOUT.margin.portrait;
  const bottom = landscape
    ? ACTION_LAYOUT.bottom.landscape
    : ACTION_LAYOUT.bottom.portrait;
  const right = width - insets.right - margin;
  const floor = height - insets.bottom - bottom;
  const dash = {
    left: right - ACTION_LAYOUT.dashSize,
    top: floor - ACTION_LAYOUT.dashSize,
    right,
    bottom: floor,
  };
  const ultimateRight = dash.left - ACTION_LAYOUT.gap;
  const ultimate = {
    left: ultimateRight - ACTION_LAYOUT.ultimateSize,
    top: floor - ACTION_LAYOUT.ultimateSize,
    right: ultimateRight,
    bottom: floor,
  };
  return { dash, ultimate };
}

export function actionAtPoint(x, y, metrics) {
  const within = (area) =>
    x >= area.left && x <= area.right && y >= area.top && y <= area.bottom;
  if (within(metrics.ultimate)) return "ultimate";
  if (within(metrics.dash)) return "dash";
  return null;
}
