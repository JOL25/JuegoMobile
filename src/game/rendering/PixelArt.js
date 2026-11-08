// Compatibility entry point for the engine. Native sprites are cached vector pictures.
const XP_DIAMOND = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export function drawPixelSprite(
  ctx,
  x,
  y,
  radius,
  color,
  outline,
  vertices = null,
) {
  // Pickups formerly supplied a fresh literal each draw; share one geometry cache identity.
  if (
    vertices?.length === 4 &&
    vertices[0][0] === 0 &&
    vertices[0][1] === -1 &&
    vertices[1][0] === 1 &&
    vertices[1][1] === 0 &&
    vertices[2][0] === 0 &&
    vertices[2][1] === 1 &&
    vertices[3][0] === -1 &&
    vertices[3][1] === 0
  )
    vertices = XP_DIAMOND;
  ctx.drawPixelSprite(x, y, radius, color, outline, vertices);
}
