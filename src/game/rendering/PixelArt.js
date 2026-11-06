// Native drawing adapter caches shaded sprites as Skia pictures.
export function drawPixelSprite(ctx, x, y, radius, color, outline, vertices = null) {
  ctx.drawPixelSprite(x, y, radius, color, outline, vertices);
}
