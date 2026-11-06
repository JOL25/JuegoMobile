// Decorative world-space geometry. These marks never affect collisions or spawning.
const CELL = 192;
function polygon(ctx, x, y, radius, sides, angle = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + (i * Math.PI * 2) / sides;
    const px = x + Math.cos(a) * radius,
      py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawArenaFloor(game) {
  const { ctx, camera, canvas } = game;
  const left = camera.x - canvas.width / 2,
    top = camera.y - canvas.height / 2;
  const minCol = Math.floor(left / CELL),
    minRow = Math.floor(top / CELL);
  const maxCol = Math.ceil((left + canvas.width) / CELL),
    maxRow = Math.ceil((top + canvas.height) / CELL);
  ctx.save();
  ctx.lineWidth = 1;
  for (let row = minRow; row <= maxRow; row++)
    for (let col = minCol; col <= maxCol; col++) {
      const p = camera.worldToScreen(col * CELL, row * CELL);
      const alternate = (((col + row) % 2) + 2) % 2;
      ctx.fillStyle = alternate ? "#101d2a" : "#0d1825";
      ctx.fillRect(p.x + 3, p.y + 3, CELL - 6, CELL - 6);
      ctx.strokeStyle = "#243849";
      // Beveled panel corners and thin etched circuits distinguish the floor from enemies.
      ctx.beginPath();
      ctx.moveTo(p.x + 18, p.y + 5);
      ctx.lineTo(p.x + 5, p.y + 5);
      ctx.lineTo(p.x + 5, p.y + 18);
      ctx.stroke();
      ctx.strokeStyle = "rgba(126,198,224,0.12)";
      ctx.beginPath();
      ctx.moveTo(p.x + 42, p.y + CELL - 5);
      ctx.lineTo(p.x + CELL - 42, p.y + CELL - 5);
      ctx.stroke();
      ctx.fillStyle = "rgba(126,198,224,0.22)";
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      if (alternate) {
        ctx.strokeStyle = "rgba(126,198,224,0.09)";
        polygon(ctx, p.x + CELL / 2, p.y + CELL / 2, 24, 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x + CELL / 2 - 5, p.y + CELL / 2);
        ctx.lineTo(p.x + CELL / 2 + 5, p.y + CELL / 2);
        ctx.stroke();
      }
    }

  // A fixed central reactor/compass anchors movement in the otherwise endless arena.
  const origin = camera.worldToScreen(0, 0);
  if (camera.isVisible(0, 0, 250)) {
    ctx.strokeStyle = "rgba(232,177,58,0.20)";
    ctx.lineWidth = 2;
    polygon(ctx, origin.x, origin.y, 156, 6);
    ctx.stroke();
    ctx.strokeStyle = "rgba(126,198,224,0.19)";
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 126, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(126,198,224,0.10)";
    ctx.lineWidth = 8;
    const rotation = game.renderer?.reducedMotion
      ? 0
      : (game.player?.survivalTime ?? 0) * 0.16;
    for (let i = 0; i < 3; i++) {
      const start = rotation + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 114, start, start + 0.72);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(232,177,58,0.13)";
    ctx.lineWidth = 1;
    polygon(ctx, origin.x, origin.y, 72, 3);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(origin.x + Math.cos(a) * 172, origin.y + Math.sin(a) * 172);
      ctx.lineTo(
        origin.x + Math.cos(a) * (i % 3 ? 179 : 190),
        origin.y + Math.sin(a) * (i % 3 ? 179 : 190),
      );
      ctx.stroke();
    }
  }

  // Sector rails remain aligned to the world when the camera follows the player.
  ctx.strokeStyle = "rgba(126,198,224,0.12)";
  ctx.lineWidth = 2;
  for (
    let col = Math.floor(left / 768);
    col <= Math.ceil((left + canvas.width) / 768);
    col++
  ) {
    const x = camera.worldToScreen(col * 768, 0).x;
    ctx.beginPath();
    ctx.moveTo(x - 8, 0);
    ctx.lineTo(x - 8, canvas.height);
    ctx.moveTo(x + 8, 0);
    ctx.lineTo(x + 8, canvas.height);
    ctx.stroke();
  }
  ctx.restore();
}
