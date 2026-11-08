import {
  Skia,
  PaintStyle,
  StrokeCap,
  type SkCanvas,
  type SkPicture,
  type SkPath,
  type SkRect,
  type SkColor,
  type SkImage,
  FilterMode,
  MipmapMode,
} from "@shopify/react-native-skia";

type Sprite = {
  picture: SkPicture;
  bounds: SkRect;
  image: SkImage | null;
  source: SkRect | null;
};
const SPRITE_RASTER_SCALE = 3;
let rasterSurfaceAvailable = true;
let spriteCacheBuilds = 0;
let spriteCacheEvictions = 0;
type Palette = Map<string, Map<string, Sprite>>;
type Sizes = Map<number, Palette>;
// Geometry arrays are stable engine constants; the wrapper canonicalizes XP diamonds.
const polygonSprites = new WeakMap<number[][], Sizes>();
const circularSprites: Sizes = new Map();
const spriteOrder: {
  palette: Map<string, Sprite>;
  outline: string;
  sprite: Sprite;
}[] = [];
const MAX_CACHED_SPRITES = 256;
const colorCache = new Map<string, SkColor>();
const glyphPaths = new Map<string, SkPath>();
function colorValue(value: string) {
  let color = colorCache.get(value);
  if (!color) {
    color = Skia.Color(value);
    // Halo alpha changes continuously. Bound the parsing cache rather than retaining every frame.
    if (colorCache.size >= 256)
      colorCache.delete(colorCache.keys().next().value!);
    colorCache.set(value, color);
  }
  return color;
}
function spriteShape(radius: number, vertices: number[][] | null) {
  const builder = Skia.PathBuilder.Make();
  if (!vertices) builder.addCircle(0, 0, radius);
  else {
    for (let i = 0; i < vertices.length; i++) {
      const [x, y] = vertices[i];
      if (!i) builder.moveTo(x * radius, y * radius);
      else builder.lineTo(x * radius, y * radius);
    }
    builder.close();
  }
  const path = builder.detach();
  builder.dispose();
  return path;
}
function vectorSprite(
  radius: number,
  color: string,
  outline: string,
  vertices: number[][] | null,
): Sprite {
  const extent = radius + 3;
  const bounds = Skia.XYWHRect(-extent, -extent, extent * 2, extent * 2);
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(bounds);
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const body = spriteShape(radius - 0.65, vertices);
  paint.setColor(colorValue("#07101b"));
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(3.2);
  canvas.drawPath(body, paint);
  paint.setColor(colorValue(color));
  paint.setStyle(PaintStyle.Fill);
  canvas.drawPath(body, paint);
  if (vertices) {
    // Facets stay inside the silhouette and are recorded once for each size/palette.
    const builder = Skia.PathBuilder.Make();
    for (let i = 0; i < vertices.length; i++) {
      const [x, y] = vertices[i],
        [nx, ny] = vertices[(i + 1) % vertices.length];
      builder.moveTo(0, 0);
      builder.lineTo(x * (radius - 1), y * (radius - 1));
      builder.lineTo(nx * (radius - 1), ny * (radius - 1));
      builder.close();
      const facet = builder.detach();
      paint.setColor(
        colorValue(
          (y + ny) / 2 < -0.1 ? "rgba(255,255,255,0.20)" : "rgba(4,10,18,0.20)",
        ),
      );
      canvas.drawPath(facet, paint);
      facet.dispose();
    }
    builder.dispose();
    const inset = spriteShape(radius * 0.54, vertices);
    paint.setColor(colorValue(outline));
    paint.setAlphaf(0.42);
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(0.8);
    canvas.drawPath(inset, paint);
    inset.dispose();
    paint.setColor(colorValue("rgba(239,249,255,0.64)"));
    paint.setStyle(PaintStyle.Fill);
    canvas.drawCircle(0, -radius * 0.07, Math.max(0.9, radius * 0.07), paint);
  } else {
    // The hero is a true circle with an inset rim; the aim chevron is drawn by Player.
    const inset = spriteShape(radius * 0.72, null);
    paint.setColor(colorValue("rgba(255,255,255,0.42)"));
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(0.8);
    canvas.drawPath(inset, paint);
    inset.dispose();
  }
  paint.setColor(colorValue(outline));
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(radius < 9 ? 0.8 : 1.35);
  canvas.drawPath(body, paint);
  body.dispose();
  paint.dispose();
  const picture = recorder.finishRecordingAsPicture();
  recorder.dispose();
  let image: SkImage | null = null;
  let source: SkRect | null = null;
  if (rasterSurfaceAvailable) {
    const pixels = Math.ceil(extent * 2 * SPRITE_RASTER_SCALE);
    // CPU-backed Make is intentional: MakeOffscreen creates a separate WebGL context per
    // sprite on web. A single immutable bitmap is uploaded/cached by the drawing backend.
    let surface: ReturnType<typeof Skia.Surface.Make> = null;
    try {
      surface = Skia.Surface.Make(pixels, pixels);
      if (surface) {
        const bitmap = surface.getCanvas();
        bitmap.clear(colorValue("rgba(0,0,0,0)"));
        const scale = pixels / (extent * 2);
        bitmap.scale(scale, scale);
        bitmap.translate(extent, extent);
        bitmap.drawPicture(picture);
        surface.flush();
        image = surface.makeImageSnapshot();
        source = Skia.XYWHRect(0, 0, pixels, pixels);
      } else rasterSurfaceAvailable = false;
    } catch {
      // A context without raster surface support retains the exact vector appearance.
      image?.dispose();
      image = null;
      source = null;
      rasterSurfaceAvailable = false;
    } finally {
      surface?.dispose();
    }
  }
  spriteCacheBuilds++;
  return { picture, bounds, image, source };
}
function cachedSprite(
  radius: number,
  color: string,
  outline: string,
  vertices: number[][] | null,
) {
  let sizes = vertices ? polygonSprites.get(vertices) : circularSprites;
  if (!sizes) {
    sizes = new Map();
    polygonSprites.set(vertices!, sizes);
  }
  let palette = sizes.get(radius);
  if (!palette) {
    palette = new Map();
    sizes.set(radius, palette);
  }
  let outlines = palette.get(color);
  if (!outlines) {
    outlines = new Map();
    palette.set(color, outlines);
  }
  let sprite = outlines.get(outline);
  if (!sprite) {
    sprite = vectorSprite(radius, color, outline, vertices);
    outlines.set(outline, sprite);
    spriteOrder.push({ palette: outlines, outline, sprite });
    if (spriteOrder.length > MAX_CACHED_SPRITES) {
      const oldest = spriteOrder.shift()!;
      if (oldest.palette.get(oldest.outline) === oldest.sprite)
        oldest.palette.delete(oldest.outline);
      // Recorded frame pictures retain their own native references to these immutable commands.
      oldest.sprite.image?.dispose();
      oldest.sprite.picture.dispose();
      spriteCacheEvictions++;
    }
  }
  return sprite;
}
export function getSpriteCacheStats() {
  let images = 0,
    imagePixels = 0;
  for (const record of spriteOrder)
    if (record.sprite.image) {
      images++;
      imagePixels += record.sprite.image.width() * record.sprite.image.height();
    }
  return {
    cached: spriteOrder.length,
    images,
    vectorFallbacks: spriteOrder.length - images,
    rasterScale: SPRITE_RASTER_SCALE,
    estimatedImageBytes: imagePixels * 4,
    builds: spriteCacheBuilds,
    evictions: spriteCacheEvictions,
  };
}
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
type DrawingState = {
  fillStyle: string;
  strokeStyle: string;
  globalAlpha: number;
  lineWidth: number;
  lineCap: string;
  font: string;
  textAlign: string;
  textBaseline: string;
  shadowBlur: number;
  shadowColor: string;
};

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
  private stack: DrawingState[] = [];
  private depth = 0;
  private layerPaint = Skia.Paint();
  private paintedColor: string | null = null;
  private paintedAlpha = NaN;
  private paintedStyle = -1;
  private paintedWidth = NaN;
  private paintedCap = -1;
  private path = Skia.PathBuilder.Make();
  private paint = Skia.Paint();
  constructor(private canvas: SkCanvas) {
    this.paint.setAntiAlias(true);
  }
  // A fresh recording canvas can reuse this adapter without allocating paint/path/style stacks.
  reset(canvas: SkCanvas) {
    this.canvas = canvas;
    this.depth = 0;
    this.path.reset();
    this.fillStyle = this.strokeStyle = "#ffffff";
    this.globalAlpha = this.lineWidth = 1;
    this.lineCap = "butt";
    this.font = "14px monospace";
    this.textAlign = "left";
    this.textBaseline = "alphabetic";
    this.shadowBlur = 0;
    this.shadowColor = "#000000";
  }
  save() {
    let state = this.stack[this.depth];
    if (!state) {
      state = {} as DrawingState;
      this.stack[this.depth] = state;
    }
    this.depth++;
    state.fillStyle = this.fillStyle;
    state.strokeStyle = this.strokeStyle;
    state.globalAlpha = this.globalAlpha;
    state.lineWidth = this.lineWidth;
    state.lineCap = this.lineCap;
    state.font = this.font;
    state.textAlign = this.textAlign;
    state.textBaseline = this.textBaseline;
    state.shadowBlur = this.shadowBlur;
    state.shadowColor = this.shadowColor;
    this.canvas.save();
  }
  restore() {
    if (!this.depth) return;
    const state = this.stack[--this.depth];
    this.fillStyle = state.fillStyle;
    this.strokeStyle = state.strokeStyle;
    this.globalAlpha = state.globalAlpha;
    this.lineWidth = state.lineWidth;
    this.lineCap = state.lineCap;
    this.font = state.font;
    this.textAlign = state.textAlign;
    this.textBaseline = state.textBaseline;
    this.shadowBlur = state.shadowBlur;
    this.shadowColor = state.shadowColor;
    this.canvas.restore();
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
    const value = stroke ? this.strokeStyle : this.fillStyle;
    const color = colorValue(value);
    if (this.paintedColor !== value) {
      this.paint.setColor(color);
      this.paintedColor = value;
      this.paintedAlpha = NaN;
    }
    const alpha = Math.max(0, Math.min(1, color[3] * this.globalAlpha));
    if (this.paintedAlpha !== alpha) {
      this.paint.setAlphaf(alpha);
      this.paintedAlpha = alpha;
    }
    const style = stroke ? PaintStyle.Stroke : PaintStyle.Fill;
    if (this.paintedStyle !== style) {
      this.paint.setStyle(style);
      this.paintedStyle = style;
    }
    if (stroke) {
      if (this.paintedWidth !== this.lineWidth) {
        this.paint.setStrokeWidth(this.lineWidth);
        this.paintedWidth = this.lineWidth;
      }
      const cap = this.lineCap === "round" ? StrokeCap.Round : StrokeCap.Butt;
      if (this.paintedCap !== cap) {
        this.paint.setStrokeCap(cap);
        this.paintedCap = cap;
      }
    }
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
    // Cache one native path per digit instead of issuing a rectangle for every lit pixel.
    const size = Number(this.font.match(/([\d.]+)px/)?.[1] ?? 14);
    const pixel = size / 7;
    let width = 0;
    for (let i = 0; i < text.length; i++)
      width += ((digits[text[i]]?.[0].length ?? 3) + 1) * pixel;
    if (this.textAlign === "center") x -= width / 2;
    if (this.textAlign === "right") x -= width;
    y -= this.textBaseline === "middle" ? pixel * 2.5 : pixel * 5;
    const paint = this.brush();
    this.canvas.save();
    this.canvas.translate(x, y);
    this.canvas.scale(pixel, pixel);
    for (let i = 0; i < text.length; i++) {
      const char = text[i],
        glyph = digits[char];
      if (!glyph) continue;
      let path = glyphPaths.get(char);
      if (!path) {
        const builder = Skia.PathBuilder.Make();
        for (let row = 0; row < glyph.length; row++)
          for (let col = 0; col < glyph[row].length; col++) {
            if (glyph[row][col] === "1")
              builder.addRect(Skia.XYWHRect(col, row, 1, 1));
          }
        path = builder.detach();
        builder.dispose();
        glyphPaths.set(char, path);
      }
      this.canvas.drawPath(path, paint);
      this.canvas.translate(glyph[0].length + 1, 0);
    }
    this.canvas.restore();
  }
  drawPixelSprite(
    x: number,
    y: number,
    radius: number,
    color: string,
    outline: string,
    vertices: number[][] | null,
  ) {
    // Compatibility entry point: vector-authored sprites become one cached image draw.
    const sprite = cachedSprite(radius, color, outline, vertices);
    this.canvas.save();
    this.canvas.translate(x, y);
    this.layerPaint.setAlphaf(Math.max(0, Math.min(1, this.globalAlpha)));
    if (sprite.image && sprite.source) {
      this.canvas.drawImageRectOptions(
        sprite.image,
        sprite.source,
        sprite.bounds,
        FilterMode.Linear,
        MipmapMode.None,
        this.layerPaint,
      );
    } else {
      if (this.globalAlpha < 1)
        this.canvas.saveLayer(this.layerPaint, sprite.bounds);
      this.canvas.drawPicture(sprite.picture);
      if (this.globalAlpha < 1) this.canvas.restore();
    }
    this.canvas.restore();
  }
  getSpriteCacheStats() {
    return getSpriteCacheStats();
  }
  dispose() {
    this.path.dispose();
    this.paint.dispose();
    this.layerPaint.dispose();
  }
}
