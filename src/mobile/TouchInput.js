// Platform-independent input state; React Native owns touch delivery.
export class TouchInput {
  constructor() {
    this.move = { x: 0, y: 0 };
    this.actions = new Set();
    this.pointerId = null;
    this.pauseCallback = null;
  }
  onPause(callback) {
    this.pauseCallback = callback;
  }
  begin(id, x, y) {
    if (this.pointerId !== null) return false;
    this.pointerId = id;
    this.origin = { x, y };
    return true;
  }
  drag(id, x, y, radius = 48) {
    if (id !== this.pointerId || !this.origin) return;
    const dx = (x - this.origin.x) / radius;
    const dy = (y - this.origin.y) / radius;
    const length = Math.hypot(dx, dy);
    this.move =
      length < 0.08
        ? { x: 0, y: 0 }
        : { x: dx / Math.max(1, length), y: dy / Math.max(1, length) };
  }
  end(id) {
    if (id === this.pointerId) this.resetMovement();
  }
  resetMovement() {
    this.pointerId = null;
    this.origin = null;
    this.move = { x: 0, y: 0 };
  }
  getMoveVector() {
    return this.move;
  }
  queueDash() {
    this.actions.add("dash");
  }
  queueUltimate() {
    this.actions.add("ultimate");
  }
  consume(action) {
    const queued = this.actions.has(action);
    this.actions.delete(action);
    return queued;
  }
  consumeDash() {
    return this.consume("dash");
  }
  consumeUltimate() {
    return this.consume("ultimate");
  }
  resetActions() {
    this.actions.clear();
  }
  reset() {
    this.resetMovement();
    this.resetActions();
  }
}
