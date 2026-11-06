import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

// Code-native geometric identity; no downloaded artwork or font dependencies.
function crc32(data) {
  let crc = -1;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}
function chunk(name, data) {
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  result.write(name, 4);
  data.copy(result, 8);
  result.writeUInt32BE(
    crc32(result.subarray(4, 8 + data.length)),
    8 + data.length,
  );
  return result;
}
function polygon(x, y, points) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i],
      [bx, by] = points[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
      hit = !hit;
  }
  return hit;
}
function image(size, transparent) {
  const rgba = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = ((x + 0.5) * 1024) / size,
        py = ((y + 0.5) * 1024) / size;
      let color = transparent ? [0, 0, 0, 0] : [18, 10, 16, 255];
      if (Math.hypot(px - 512, py - 512) < 225) color = [255, 255, 255, 255];
      if (Math.hypot(px - 512, py - 512) < 211) color = [232, 217, 192, 255];
      if (
        polygon(px, py, [
          [395, 490],
          [550, 490],
          [510, 450],
          [540, 420],
          [635, 512],
          [540, 604],
          [510, 574],
          [550, 534],
          [395, 534],
        ])
      )
        color = [35, 19, 28, 255];
      if (
        polygon(px, py, [
          [780, 235],
          [858, 370],
          [702, 370],
        ])
      )
        color = [138, 107, 177, 255];
      if (
        polygon(px, py, [
          [200, 670],
          [290, 700],
          [260, 790],
          [170, 760],
        ])
      )
        color = [126, 198, 224, 255];
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      color.forEach((value, i) => {
        rgba[offset + i] = value;
      });
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rgba)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
writeFileSync(
  new URL("../assets/icon.png", import.meta.url),
  image(1024, false),
);
writeFileSync(
  new URL("../assets/android-icon-foreground.png", import.meta.url),
  image(1024, true),
);
writeFileSync(
  new URL("../assets/favicon.png", import.meta.url),
  image(64, false),
);
console.log("Generated geometric mobile icons.");
