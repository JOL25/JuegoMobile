import {
  Skia,
  PaintStyle,
  StrokeCap,
  type SkCanvas,
  type SkPicture,
} from "@shopify/react-native-skia";

const spriteCache = new Map<string, SkPicture>();
const digits: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  "-": ["000", "000", "111", "000", "000"],
  "∞": ["00000", "01010", "10101", "01010", "00000"],
};
const styleKeys = [
  "fillStyle",
  "strokeStyle",
  "globalAlpha",
  "lineWidth",
  "lineCap",
  "font",
  "textAlign",
  "textBaseline",
  "shadowBlur",
  "shadowColor",
] as const;

// The small Canvas2D subset used by the game's entities, implemented on native Skia.
// There is no HTML canvas, DOM, browser or WebView in the mobile runtime.
export class SkiaContext {
  fillStyle = "#ffffff";
  strokeStyle = "#ffffff";
  globalAlpha = 1;
  lineWidth = 1;
  lineCap = "butt";
  font = "14px monospace";
  textAlign = "left";
  textBaseline = "alphabetic";
  shadowBlur = 0;
  shadowColor = "#000000";
  private stack: Record<string, unknown>[] = [];
  private path = Skia.PathBuilder.Make();
  private paint = Skia.Paint();
  constructor(private canvas: SkCanvas) {}
  save() {
    this.stack.push(
      Object.fromEntries(styleKeys.map((key) => [key, this[key]])),
    );
    this.canvas.save();
  }
  restore() {
    const style = this.stack.pop();
    if (style) {
      Object.assign(this, style);
      this.canvas.restore();
    }
  }
  translate(x: number, y: number) {
    this.canvas.translate(x, y);
  }
  scale(x: number, y: number) {
    this.canvas.scale(x, y);
  }
  rotate(radians: number) {
    this.canvas.rotate((radians * 180) / Math.PI, 0, 0);
  }
  beginPath() {
    this.path.reset();
  }
  closePath() {
    this.path.close();
  }
  moveTo(x: number, y: number) {
    this.path.moveTo(x, y);
  }
  lineTo(x: number, y: number) {
    this.path.lineTo(x, y);
  }
  arc(x: number, y: number, r: number, start: number, end: number) {
    this.ellipse(x, y, r, r, 0, start, end);
  }
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
    start: number,
    end: number,
  ) {
    // All current game ellipses have zero rotation. Rotation of projectiles is applied on the canvas.
    if (rotation !== 0)
      throw new Error("Rotated ellipse not used by this renderer");
    this.path.addArc(
      Skia.XYWHRect(x - rx, y - ry, rx * 2, ry * 2),
      (start * 180) / Math.PI,
      Math.min(360, ((end - start) * 180) / Math.PI),
    );
  }
  private brush(stroke = false) {
    this.paint.setColor(Skia.Color(stroke ? this.strokeStyle : this.fillStyle));
    // setAlphaf replaces alpha: multiply the CSS color alpha explicitly.
    const color = Skia.Color(stroke ? this.strokeStyle : this.fillStyle);
    this.paint.setAlphaf(color[3] * this.globalAlpha);
    this.paint.setStyle(stroke ? PaintStyle.Stroke : PaintStyle.Fill);
    this.paint.setStrokeWidth(this.lineWidth);
    this.paint.setStrokeCap(
      this.lineCap === "round" ? StrokeCap.Round : StrokeCap.Butt,
    );
    this.paint.setAntiAlias(true);
    return this.paint;
  }
  fill() {
    const path = this.path.build();
    this.canvas.drawPath(path, this.brush());
    path.dispose();
  }
  stroke() {
    const path = this.path.build();
    this.canvas.drawPath(path, this.brush(true));
    path.dispose();
  }
  fillRect(x: number, y: number, w: number, h: number) {
    this.canvas.drawRect(Skia.XYWHRect(x, y, w, h), this.brush());
  }
  strokeRect(x: number, y: number, w: number, h: number) {
    this.canvas.drawRect(Skia.XYWHRect(x, y, w, h), this.brush(true));
  }
  fillText(text: string, x: number, y: number) {
    // Only damage numbers and the infinity pickup are drawn in-world.
    // Pixel glyphs are offline and identical on iOS, Android and the QA preview.
    const size = Number(this.font.match(/([\d.]+)px/)?.[1] ?? 14);
    const pixel = size / 7;
    const width = [...text].reduce(
      (sum, ch) => sum + ((digits[ch]?.[0].length ?? 3) + 1) * pixel,
      0,
    );
    if (this.textAlign === "center") x -= width / 2;
    if (this.textAlign === "right") x -= width;
    y -= this.textBaseline === "middle" ? pixel * 2.5 : pixel * 5;
    for (const ch of text) {
      const glyph = digits[ch];
      if (!glyph) continue;
      glyph.forEach((row, iy) =>
        [...row].forEach((bit, ix) => {
          if (bit === "1")
            this.fillRect(x + ix * pixel, y + iy * pixel, pixel, pixel);
        }),
      );
      x += (glyph[0].length + 1) * pixel;
    }
  }
  drawPixelSprite(
    x: number,
    y: number,
    radius: number,
    color: string,
    outline: string,
    vertices: number[][] | null,
  ) {
    const key = JSON.stringify([radius, color, outline, vertices]);
    let picture = spriteCache.get(key);
    const step = 2;
    const half = Math.ceil((radius + step) / step);
    const size = half * 2;
    if (!picture) {
      const recorder = Skia.PictureRecorder();
      const target = recorder.beginRecording(
        Skia.XYWHRect(0, 0, size * step, size * step),
      );
      const paint = Skia.Paint();
      paint.setAntiAlias(false);
      const mask = (col: number, row: number) => {
        const nx = ((col - half + 0.5) * step) / radius;
        const ny = ((row - half + 0.5) * step) / radius;
        if (!vertices) return nx * nx + ny * ny <= 1;
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
          const [ax, ay] = vertices[i],
            [bx, by] = vertices[j];
          if (
            ay > ny !== by > ny &&
            nx < ((bx - ax) * (ny - ay)) / (by - ay) + ax
          )
            inside = !inside;
        }
        return inside;
      };
      for (let row = 0; row < size; row++)
        for (let col = 0; col < size; col++) {
          if (!mask(col, row)) continue;
          const edge =
            !mask(col - 1, row) ||
            !mask(col + 1, row) ||
            !mask(col, row - 1) ||
            !mask(col, row + 1);
          const rect = Skia.XYWHRect(col * step, row * step, step, step);
          paint.setColor(Skia.Color(edge ? outline : color));
          target.drawRect(rect, paint);
          if (!edge && (row < half - 2 || row > half + 1)) {
            paint.setColor(
              Skia.Color(
                row < half - 2 ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.28)",
              ),
            );
            target.drawRect(rect, paint);
          }
        }
      picture = recorder.finishRecordingAsPicture();
      recorder.dispose();
      paint.dispose();
      spriteCache.set(key, picture);
    }
    this.canvas.save();
    this.canvas.translate(
      Math.round(x / step) * step - size,
      Math.round(y / step) * step - size,
    );
    // saveLayer carries invulnerability flicker onto the cached native sprite.
    if (this.globalAlpha < 1) {
      this.paint.setAlphaf(this.globalAlpha);
      this.canvas.saveLayer(this.paint);
    }
    this.canvas.drawPicture(picture);
    if (this.globalAlpha < 1) this.canvas.restore();
    this.canvas.restore();
  }
  dispose() {
    this.path.dispose();
    this.paint.dispose();
  }
}
