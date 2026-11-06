import { WORLD } from "../config.js";
import { STATE } from "../core/GameState.js";
import { drawArenaFloor } from "./ArenaFloor.js";

export class WorldRenderer {
  setReducedMotion(enabled) {
    this.reducedMotion = enabled;
  }

  render(game) {
    const { canvas, ctx } = game;
    ctx.save();

    if (game.shakeTimer > 0 && !this.reducedMotion) {
      const magnitude = 5 * (game.shakeTimer / 140);
      ctx.translate(
        (Math.random() - 0.5) * magnitude,
        (Math.random() - 0.5) * magnitude,
      );
    }

    ctx.fillStyle = "#0b1119";
    ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
    drawArenaFloor(game);

    if (game.state !== STATE.MENU) this.drawWorld(game);

    ctx.restore();
  }

  drawWorld(game) {
    const { ctx, camera } = game;
    const half = WORLD.size / 2;
    const topLeft = camera.worldToScreen(-half, -half);
    ctx.save();
    ctx.strokeStyle = "rgba(232,177,58,0.55)";
    ctx.lineWidth = 4;
    ctx.strokeRect(topLeft.x, topLeft.y, WORLD.size, WORLD.size);
    ctx.strokeStyle = "rgba(126,198,224,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      topLeft.x + 12,
      topLeft.y + 12,
      WORLD.size - 24,
      WORLD.size - 24,
    );
    ctx.restore();

    for (const effect of game.auraEffects) {
      const screen = camera.worldToScreen(effect.x, effect.y);
      const progress = effect.age / effect.life;
      ctx.save();
      ctx.globalAlpha = 0.25 * (1 - progress);
      ctx.strokeStyle = "#a8e6a1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        screen.x,
        screen.y,
        effect.radius * (0.7 + 0.3 * progress),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }

    for (const effect of game.shockwaves) {
      const screen = camera.worldToScreen(effect.x, effect.y);
      const progress = effect.radius / effect.maxRadius;
      ctx.save();
      ctx.globalAlpha = 0.55 * (1 - progress);
      ctx.strokeStyle = "#ffb347";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.2 * (1 - progress);
      ctx.fillStyle = "#ff7a3a";
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, effect.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    game.pickupPool.forEachActive((pickup) => {
      if (!camera.isVisible(pickup.x, pickup.y, pickup.radius)) return;
      const screen = camera.worldToScreen(pickup.x, pickup.y);
      pickup.draw(ctx, screen.x, screen.y);
    });

    game.enemyPool.forEachActive((enemy) => {
      if (!camera.isVisible(enemy.x, enemy.y, enemy.radius)) return;
      const screen = camera.worldToScreen(enemy.x, enemy.y);
      enemy.draw(ctx, screen.x, screen.y);
    });

    for (const effect of game.swipeEffects) {
      const screen = camera.worldToScreen(effect.x, effect.y);
      const progress = effect.age / effect.life;
      ctx.save();
      ctx.globalAlpha = 0.7 * (1 - progress);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      const halfArc = (effect.arcDeg * Math.PI) / 360;
      this.drawArc(
        ctx,
        screen.x,
        screen.y,
        effect.range,
        effect.angle,
        halfArc,
      );
      if (effect.bothSides) {
        this.drawArc(
          ctx,
          screen.x,
          screen.y,
          effect.range,
          effect.angle + Math.PI,
          halfArc,
        );
      }
      ctx.restore();
    }

    for (const effect of game.beamEffects) {
      const start = camera.worldToScreen(effect.ax, effect.ay);
      const end = camera.worldToScreen(effect.bx, effect.by);
      const progress = effect.age / effect.life;
      ctx.save();
      ctx.globalAlpha = 0.9 * (1 - progress);
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = effect.width;
      ctx.lineCap = "round";
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    }

    const playerScreen = camera.worldToScreen(game.player.x, game.player.y);
    this.drawPlayerPresence(game, playerScreen);
    game.player.draw(ctx, playerScreen.x, playerScreen.y);
    if (game.player.ultimate)
      game.player.ultimate.draw(ctx, camera, game.player);

    game.projectilePool.forEachActive((projectile) => {
      if (!camera.isVisible(projectile.x, projectile.y, projectile.radius))
        return;
      const screen = camera.worldToScreen(projectile.x, projectile.y);
      projectile.draw(ctx, screen.x, screen.y);
    });

    game.particlePool.forEachActive((particle) => {
      const screen = camera.worldToScreen(particle.x, particle.y);
      particle.draw(ctx, screen.x, screen.y);
    });
  }

  // Renderer-local observations create feedback without adding rules to the simulation.
  drawPlayerPresence(game, screen) {
    const { ctx, player } = game;
    const time = player.survivalTime || 0;
    if (this.observedPlayer !== player) {
      this.observedPlayer = player;
      this.lastLevel = player.level;
      this.lastXp = player.xp;
      this.birthAt = time;
      this.levelAt = -Infinity;
      this.xpAt = -Infinity;
    }
    if (player.level > this.lastLevel) this.levelAt = time;
    else if (player.xp > this.lastXp) this.xpAt = time;
    this.lastLevel = player.level;
    this.lastXp = player.xp;
    const radius = player.radius || 14;
    const lowHealth = player.hp / player.maxHp < 0.3;
    const lowPulse = this.reducedMotion ? 0 : (Math.sin(time * 4) + 1) * 0.04;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.beginPath();
    ctx.ellipse(
      screen.x,
      screen.y + radius * 0.7,
      radius * 1.2,
      radius * 0.34,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = lowHealth
      ? `rgba(237,135,150,${0.3 + lowPulse})`
      : "rgba(126,198,224,0.19)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    // Small compass cuts make the circular hero readable against polygon hordes.
    ctx.strokeStyle = lowHealth
      ? "rgba(237,135,150,0.40)"
      : "rgba(126,198,224,0.35)";
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.moveTo(
        screen.x + Math.cos(angle) * (radius + 9),
        screen.y + Math.sin(angle) * (radius + 9),
      );
      ctx.lineTo(
        screen.x + Math.cos(angle) * (radius + 13),
        screen.y + Math.sin(angle) * (radius + 13),
      );
    }
    ctx.stroke();
    if (!this.reducedMotion) {
      this.drawFeedbackRing(
        ctx,
        screen,
        time - this.birthAt,
        1.15,
        radius + 12,
        54,
        "#7ec6e0",
        0.42,
      );
      this.drawFeedbackRing(
        ctx,
        screen,
        time - this.xpAt,
        0.28,
        radius + 3,
        16,
        "#7ec6e0",
        0.55,
      );
      this.drawFeedbackRing(
        ctx,
        screen,
        time - this.levelAt,
        1.1,
        radius + 12,
        120,
        "#e8b13a",
        0.72,
      );
      if (time - this.levelAt < 1.1)
        this.drawFeedbackRing(
          ctx,
          screen,
          Math.max(0, time - this.levelAt - 0.12),
          0.98,
          radius + 8,
          86,
          "#f4ece0",
          0.3,
        );
    }
    if (game.shakeTimer > 0) {
      const progress = 1 - Math.min(1, game.shakeTimer / 140);
      ctx.strokeStyle = "rgba(237,135,150,0.70)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        screen.x,
        screen.y,
        radius + 8 + (this.reducedMotion ? 0 : progress * 24),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    if (player.dashActive > 0) {
      ctx.strokeStyle = "rgba(126,198,224,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFeedbackRing(
    ctx,
    screen,
    age,
    duration,
    startRadius,
    expansion,
    color,
    strength,
  ) {
    if (age < 0 || age >= duration) return;
    const progress = age / duration;
    ctx.save();
    ctx.globalAlpha = (1 - progress) * strength;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      screen.x,
      screen.y,
      startRadius + expansion * progress,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }

  drawArc(ctx, centerX, centerY, radius, centerAngle, halfArc) {
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius,
      centerAngle - halfArc,
      centerAngle + halfArc,
    );
    ctx.stroke();
  }
}
