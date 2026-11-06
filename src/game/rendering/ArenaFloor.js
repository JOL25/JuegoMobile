// Etched world-space geometry: every mark is decorative and never affects combat.
const TAU = Math.PI * 2;
const PANEL = 256;

function polygon(ctx, x, y, radius, sides, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i * TAU) / sides;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function ring(ctx, x, y, radius, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.stroke();
}

function centralSeal(ctx, x, y, time, reducedMotion) {
  // Restrained concentric washes create depth without textures or image downloads.
  for (let i = 4; i >= 1; i--) {
    ctx.fillStyle = "rgba(27,47,58,0.16)";
    ctx.beginPath();
    ctx.arc(x, y, 62 + i * 26, 0, TAU);
    ctx.fill();
  }
  ring(ctx, x, y, 174, "rgba(218,180,103,0.16)");
  ring(ctx, x, y, 166, "rgba(218,180,103,0.07)");
  ctx.strokeStyle = "rgba(151,187,201,0.16)";
  polygon(ctx, x, y, 144, 6);
  ctx.stroke();
  ring(ctx, x, y, 126, "rgba(151,187,201,0.10)");
  ring(ctx, x, y, 84, "rgba(218,180,103,0.13)");
  ctx.strokeStyle = "rgba(218,180,103,0.17)";
  polygon(ctx, x, y, 74, 3);
  ctx.stroke();
  ctx.strokeStyle = "rgba(151,187,201,0.10)";
  polygon(ctx, x, y, 58, 3, Math.PI / 2);
  ctx.stroke();
  const rotation = reducedMotion ? 0 : time * 0.08;
  for (let i = 0; i < 12; i++) {
    const angle = (i * TAU) / 12;
    const isMajor = i % 3 === 0;
    ctx.strokeStyle = isMajor
      ? "rgba(218,180,103,0.28)"
      : "rgba(151,187,201,0.14)";
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 181, y + Math.sin(angle) * 181);
    ctx.lineTo(
      x + Math.cos(angle) * (isMajor ? 197 : 188),
      y + Math.sin(angle) * (isMajor ? 197 : 188),
    );
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(127,190,199,0.20)";
  for (let i = 0; i < 3; i++) {
    const start = rotation + (i * TAU) / 3;
    ctx.beginPath();
    ctx.arc(x, y, 115, start, start + 0.38);
    ctx.stroke();
  }
}

function sectorSeal(ctx, x, y, index) {
  const sides = 3 + (((index % 4) + 4) % 4);
  ring(ctx, x, y, 44, "rgba(151,187,201,0.07)");
  ctx.strokeStyle = "rgba(218,180,103,0.11)";
  ctx.lineWidth = 1;
  polygon(ctx, x, y, 29, sides);
  ctx.stroke();
  ctx.fillStyle = "rgba(218,180,103,0.16)";
  ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.strokeStyle = "rgba(151,187,201,0.07)";
  ctx.beginPath();
  ctx.moveTo(x - 62, y);
  ctx.lineTo(x - 49, y);
  ctx.moveTo(x + 49, y);
  ctx.lineTo(x + 62, y);
  ctx.stroke();
}

export function drawArenaFloor(game) {
  const { ctx, camera, canvas } = game;
  const left = camera.x - canvas.width / 2;
  const top = camera.y - canvas.height / 2;
  const right = left + canvas.width;
  const bottom = top + canvas.height;
  const time = game.player?.survivalTime ?? 0;
  ctx.save();
  ctx.lineWidth = 1;

  // Fine survey lines stay below gems and projectiles in contrast.
  ctx.strokeStyle = "rgba(139,176,194,0.035)";
  ctx.beginPath();
  for (let x = Math.floor(left / 64) * 64; x <= right; x += 64) {
    const screen = camera.worldToScreen(x, 0).x;
    ctx.moveTo(screen, 0);
    ctx.lineTo(screen, canvas.height);
  }
  for (let y = Math.floor(top / 64) * 64; y <= bottom; y += 64) {
    const screen = camera.worldToScreen(0, y).y;
    ctx.moveTo(0, screen);
    ctx.lineTo(canvas.width, screen);
  }
  ctx.stroke();

  // Disconnected corner brackets and circuit fragments, instead of a heavy tile grid.
  for (
    let row = Math.floor(top / PANEL);
    row <= Math.ceil(bottom / PANEL);
    row++
  ) {
    for (
      let col = Math.floor(left / PANEL);
      col <= Math.ceil(right / PANEL);
      col++
    ) {
      const p = camera.worldToScreen(col * PANEL, row * PANEL);
      ctx.strokeStyle = "rgba(139,176,194,0.105)";
      ctx.beginPath();
      ctx.moveTo(p.x - 12, p.y);
      ctx.lineTo(p.x + 12, p.y);
      ctx.moveTo(p.x, p.y - 12);
      ctx.lineTo(p.x, p.y + 12);
      ctx.stroke();
      ctx.fillStyle = "rgba(218,180,103,0.12)";
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      if ((col + row) % 2 === 0) {
        ctx.strokeStyle = "rgba(139,176,194,0.045)";
        ctx.beginPath();
        ctx.moveTo(p.x + 38, p.y + 68);
        ctx.lineTo(p.x + 70, p.y + 68);
        ctx.lineTo(p.x + 82, p.y + 80);
        ctx.lineTo(p.x + 122, p.y + 80);
        ctx.stroke();
      }
    }
  }

  const origin = camera.worldToScreen(0, 0);
  if (camera.isVisible(0, 0, 220))
    centralSeal(ctx, origin.x, origin.y, time, !!game.renderer?.reducedMotion);

  // Distinct geometric medallions provide orientation when leaving the starting seal.
  for (let row = Math.floor(top / 768); row <= Math.ceil(bottom / 768); row++) {
    for (
      let col = Math.floor(left / 768);
      col <= Math.ceil(right / 768);
      col++
    ) {
      if (col === 0 && row === 0) continue;
      const wx = col * 768,
        wy = row * 768;
      if (!camera.isVisible(wx, wy, 70)) continue;
      const p = camera.worldToScreen(wx, wy);
      sectorSeal(ctx, p.x, p.y, col + row * 3);
    }
  }
  ctx.restore();
}
