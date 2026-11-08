// Fixed-size sample storage keeps telemetry from becoming another frame-time cost.
export class FrameMonitor {
  constructor(capacity = 240) {
    this.capacity = capacity;
    this.intervals = new Float64Array(capacity);
    this.work = new Float64Array(capacity);
    this.reset();
  }
  reset() {
    this.count = 0;
    this.index = 0;
    this.frames = 0;
    this.lastTime = null;
    this.elapsed = 0;
  }
  record(time, workMs) {
    if (this.lastTime !== null) {
      this.intervals[this.index] = Math.max(0, time - this.lastTime);
      this.work[this.index] = Math.max(0, workMs);
      this.index = (this.index + 1) % this.capacity;
      this.count = Math.min(this.capacity, this.count + 1);
    }
    this.lastTime = time;
    this.frames++;
  }
  snapshot(surface) {
    const intervals = Array.from(this.intervals.subarray(0, this.count));
    const work = Array.from(this.work.subarray(0, this.count));
    const sum = intervals.reduce((a, b) => a + b, 0);
    intervals.sort((a, b) => a - b);
    work.sort((a, b) => a - b);
    const p = (values, percentile) =>
      values.length
        ? values[
            Math.min(values.length - 1, Math.floor(values.length * percentile))
          ]
        : 0;
    const round = (value) => Math.round(value * 100) / 100;
    return {
      targetFps: 60,
      fps: round(sum ? (1000 * this.count) / sum : 0),
      frameP50Ms: round(p(intervals, 0.5)),
      frameP95Ms: round(p(intervals, 0.95)),
      workP50Ms: round(p(work, 0.5)),
      workP95Ms: round(p(work, 0.95)),
      overBudgetFrames: work.filter((value) => value > 1000 / 60).length,
      samples: this.count,
      frames: this.frames,
      capacity: this.capacity,
      surface,
      perFrameReactUpdates: 0,
      measurement: "JS submitted frames; not measured GPU presentations",
    };
  }
}

// Tolerance avoids dropping every other 60-Hz frame because timestamps are rounded.
export class FramePacer {
  constructor(fps = 60) {
    this.interval = 1000 / fps;
    this.reset();
  }
  reset() {
    this.next = null;
  }
  shouldDraw(time) {
    if (this.next === null) {
      this.next = time + this.interval;
      return true;
    }
    if (time + 0.6 < this.next) return false;
    this.next += this.interval;
    if (
      this.next <= time - this.interval ||
      this.next > time + this.interval + 0.6
    )
      this.next = time + this.interval;
    return true;
  }
}
