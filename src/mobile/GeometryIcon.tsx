import React from "react";
import { View, type ViewStyle } from "react-native";
import { itemLook } from "./visualItems.js";

type Props = {
  id: string;
  size?: number;
  color?: string;
  muted?: boolean;
  style?: ViewStyle;
};
type Point = readonly [number, number];

/**
 * Native geometry made from small views: no text glyph, emoji, image download,
 * extra dependency, or extra GPU canvas per inventory slot.
 */
export const GeometryIcon = React.memo(function GeometryIcon({
  id,
  size = 48,
  color,
  muted = false,
  style,
}: Props) {
  const look = itemLook(id);
  const ink = color ?? look.color;
  const u = size / 100;
  let key = 0;
  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width = 4,
    opacity = 1,
    tint = ink,
  ) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    return (
      <View
        key={key++}
        style={{
          position: "absolute",
          left: ((x1 + x2) / 2 - length / 2) * u,
          top: ((y1 + y2) / 2 - width / 2) * u,
          width: length * u,
          height: width * u,
          borderRadius: (width * u) / 2,
          backgroundColor: tint,
          opacity,
          transform: [{ rotate: Math.atan2(y2 - y1, x2 - x1) + "rad" }],
        }}
      />
    );
  };
  const circle = (
    x: number,
    y: number,
    radius: number,
    width = 3,
    opacity = 1,
    fill = false,
    tint = ink,
  ) => (
    <View
      key={key++}
      style={{
        position: "absolute",
        left: (x - radius) * u,
        top: (y - radius) * u,
        width: radius * 2 * u,
        height: radius * 2 * u,
        borderRadius: radius * u,
        borderWidth: fill ? 0 : width * u,
        borderColor: tint,
        backgroundColor: fill ? tint : "transparent",
        opacity,
      }}
    />
  );
  const poly = (points: readonly Point[], width = 4, opacity = 1) =>
    points.map((p, i) => {
      const next = points[(i + 1) % points.length];
      return line(p[0], p[1], next[0], next[1], width, opacity);
    });
  const regular = (
    sides: number,
    radius: number,
    offset = -Math.PI / 2,
  ): Point[] =>
    Array.from({ length: sides }, (_, i) => [
      50 + Math.cos(offset + (i * Math.PI * 2) / sides) * radius,
      50 + Math.sin(offset + (i * Math.PI * 2) / sides) * radius,
    ]);
  const arc = (radius: number, rotate: number, opacity = 1) => (
    <View
      key={key++}
      style={{
        position: "absolute",
        left: (50 - radius) * u,
        top: (50 - radius) * u,
        width: radius * 2 * u,
        height: radius * 2 * u,
        borderRadius: radius * u,
        borderWidth: 4 * u,
        borderColor: "transparent",
        borderTopColor: ink,
        borderRightColor: ink,
        opacity,
        transform: [{ rotate: rotate + "deg" }],
      }}
    />
  );
  let art: React.ReactNode;
  switch (look.shape) {
    case "needle":
      art = (
        <>
          {line(23, 77, 75, 25, 6)}
          {poly(
            [
              [56, 19],
              [81, 19],
              [81, 44],
            ],
            5,
          )}
          {line(17, 53, 40, 30, 2, 0.4)}
          {line(47, 83, 70, 60, 2, 0.4)}
          {circle(22, 78, 4, 0, 1, true)}
        </>
      );
      break;
    case "arc":
      art = (
        <>
          {arc(39, -18, 0.35)}
          {arc(28, -18)}
          {poly(
            [
              [69, 13],
              [83, 22],
              [74, 36],
            ],
            3,
          )}
          {circle(29, 72, 4, 0, 0.8, true)}
        </>
      );
      break;
    case "orbit":
      art = (
        <>
          {circle(50, 50, 38, 2, 0.45)}
          {circle(50, 50, 26, 3, 0.8)}
          {circle(50, 50, 11, 4)}
          {circle(88, 50, 5, 0, 1, true)}
          {circle(31, 17, 3, 0, 0.6, true)}
          {line(50, 4, 50, 11, 2, 0.4)}
          {line(50, 89, 50, 96, 2, 0.4)}
        </>
      );
      break;
    case "prism":
      art = (
        <>
          {poly(
            [
              [45, 18],
              [69, 60],
              [29, 60],
            ],
            4,
          )}
          {line(45, 18, 45, 60, 2, 0.4)}
          {line(9, 49, 35, 49, 4)}
          {line(62, 49, 93, 23, 3)}
          {line(62, 49, 93, 49, 3, 0.8)}
          {line(62, 49, 93, 75, 3, 0.5)}
          {line(35, 79, 63, 79, 2, 0.35)}
        </>
      );
      break;
    case "delta":
      art = (
        <>
          {poly(
            [
              [50, 12],
              [84, 74],
              [16, 74],
            ],
            5,
          )}
          {poly(
            [
              [50, 36],
              [63, 61],
              [37, 61],
            ],
            2,
            0.55,
          )}
          {line(31, 88, 39, 79, 3, 0.5)}
          {line(50, 93, 50, 80, 4)}
          {line(69, 88, 61, 79, 3, 0.5)}
        </>
      );
      break;
    case "core":
      art = (
        <>
          {circle(50, 50, 37, 3, 0.5)}
          {poly(
            [
              [50, 23],
              [77, 50],
              [50, 77],
              [23, 50],
            ],
            3,
          )}
          {line(50, 38, 50, 62, 6)}
          {line(38, 50, 62, 50, 6)}
          {circle(50, 10, 3, 0, 1, true)}
          {circle(50, 90, 3, 0, 1, true)}
        </>
      );
      break;
    case "velocity":
      art = (
        <>
          {[0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              {line(13 + i * 24, 27, 33 + i * 24, 50, 5, 0.35 + i * 0.3)}
              {line(33 + i * 24, 50, 13 + i * 24, 73, 5, 0.35 + i * 0.3)}
            </React.Fragment>
          ))}
          {line(18, 88, 72, 88, 2, 0.25)}
        </>
      );
      break;
    case "hexagon":
      art = (
        <>
          {poly(regular(6, 39), 4)}
          {poly(regular(6, 24), 2, 0.45)}
          {line(50, 26, 50, 74, 2, 0.4)}
          {line(29, 38, 71, 62, 2, 0.4)}
          {line(29, 62, 71, 38, 2, 0.4)}
          {circle(50, 50, 5, 0, 1, true)}
        </>
      );
      break;
    case "magnet":
      art = (
        <>
          {circle(50, 50, 32, 3, 0.65)}
          {circle(50, 50, 12, 4)}
          {[0, 1, 2, 3].map((i) => {
            const a = (i * Math.PI) / 2;
            return (
              <React.Fragment key={i}>
                {line(
                  50 + Math.cos(a) * 21,
                  50 + Math.sin(a) * 21,
                  50 + Math.cos(a) * 43,
                  50 + Math.sin(a) * 43,
                  3,
                  0.8,
                )}
                {circle(
                  50 + Math.cos(a) * 43,
                  50 + Math.sin(a) * 43,
                  3,
                  0,
                  1,
                  true,
                )}
              </React.Fragment>
            );
          })}
        </>
      );
      break;
    case "cycle":
      art = (
        <>
          {arc(34, 20)}
          {arc(24, 200, 0.5)}
          {poly(
            [
              [76, 32],
              [84, 48],
              [65, 45],
            ],
            3,
          )}
          {poly(
            [
              [24, 68],
              [16, 52],
              [35, 55],
            ],
            3,
            0.6,
          )}
          {circle(50, 50, 7, 0, 0.75, true)}
        </>
      );
      break;
    case "diamond":
      art = (
        <>
          {poly(
            [
              [50, 5],
              [85, 50],
              [50, 95],
              [15, 50],
            ],
            4,
          )}
          {poly(
            [
              [50, 26],
              [68, 50],
              [50, 74],
              [32, 50],
            ],
            3,
            0.6,
          )}
          {line(50, 12, 50, 88, 2, 0.4)}
          {line(19, 50, 81, 50, 2, 0.4)}
          {circle(50, 50, 5, 0, 1, true)}
        </>
      );
      break;
    case "nova":
      art = (
        <>
          {circle(50, 50, 28, 3, 0.6)}
          {circle(50, 50, 15, 4)}
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return line(
              50 + Math.cos(a) * 35,
              50 + Math.sin(a) * 35,
              50 + Math.cos(a) * 45,
              50 + Math.sin(a) * 45,
              4,
            );
          })}
          {circle(50, 50, 5, 0, 1, true)}
        </>
      );
      break;
    case "constellation": {
      const points = Array.from({ length: 18 }, (_, i): Point => {
        const a = (i * Math.PI * 2) / 18;
        const x = Math.cos(a) * 40,
          y = Math.sin(a) * 19;
        return [50 + x * 0.82 - y * 0.57, 50 + x * 0.57 + y * 0.82];
      });
      art = (
        <>
          {poly(points, 2, 0.6)}
          {circle(50, 50, 29, 2, 0.3)}
          {circle(50, 50, 10, 4)}
          {line(50, 50, 80, 71, 3)}
          {line(50, 50, 21, 28, 3, 0.7)}
          {circle(80, 71, 5, 0, 1, true)}
          {circle(21, 28, 5, 0, 1, true)}
          {circle(68, 22, 3, 0, 0.8, true)}
        </>
      );
      break;
    }
    case "dash":
      art = (
        <>
          {line(8, 40, 37, 40, 3, 0.35)}
          {line(8, 60, 29, 60, 3, 0.35)}
          {line(16, 50, 65, 50, 5)}
          {line(54, 25, 80, 50, 5)}
          {line(80, 50, 54, 75, 5)}
          {line(73, 26, 96, 50, 3, 0.5)}
          {line(96, 50, 73, 74, 3, 0.5)}
        </>
      );
      break;
    case "health":
    default:
      art = (
        <>
          {circle(50, 50, 36, 3, 0.5)}
          {line(50, 29, 50, 71, 8)}
          {line(29, 50, 71, 50, 8)}
          {line(18, 15, 28, 15, 2, 0.3)}
          {line(72, 85, 82, 85, 2, 0.3)}
        </>
      );
  }
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={[{ width: size, height: size, opacity: muted ? 0.4 : 1 }, style]}
    >
      {art}
    </View>
  );
});
