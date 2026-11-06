import React, { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { getLanguage } from "../game/ui/i18n.js";
import { nativeDriver, useReducedMotion } from "./Motion";
import { GeometryIcon } from "./GeometryIcon";
import { upgradeLook } from "./visualItems.js";
import type { Point, Upgrade } from "./UpgradeCard";
import type { SlotRegistry } from "./InventoryDock";

export type Acquisition = {
  option: Upgrade;
  source: Point;
  key: string;
  token: number;
};
export function AcquisitionFlight({
  acquisition,
  slots,
  onComplete,
}: {
  acquisition: Acquisition;
  slots: SlotRegistry;
  onComplete: (selection: Acquisition) => void;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const [destination, setDestination] = useState<Point | null>(null);
  const reduced = useReducedMotion();
  const look = upgradeLook(acquisition.option);
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let attempts = 0;
    const measure = () => {
      if (cancelled) return;
      const target = slots.current.get(acquisition.key);
      if (!target) {
        if (++attempts < 8) frame = requestAnimationFrame(measure);
        else onComplete(acquisition);
        return;
      }
      target.measureInWindow((x, y, width, height) => {
        if (!cancelled) setDestination({ x: x + width / 2, y: y + height / 2 });
      });
    };
    frame = requestAnimationFrame(measure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [acquisition, slots, onComplete]);
  useEffect(() => {
    if (!destination) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduced ? 140 : 860,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: nativeDriver,
    });
    animation.start(({ finished }) => {
      if (finished) onComplete(acquisition);
    });
    return () => animation.stop();
  }, [destination, progress, reduced, acquisition, onComplete]);
  if (!destination) return null;
  const dx = destination.x - acquisition.source.x;
  const dy = destination.y - acquisition.source.y;
  const translateX = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: reduced ? [dx, dx, dx] : [0, dx * 0.4 + 55, dx],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: reduced
      ? [dy, dy, dy]
      : [0, Math.min(-100, dy * 0.4 - 60), dy],
  });
  return (
    <View pointerEvents="none" testID="acquisition-flight" style={s.overlay}>
      <Animated.View
        style={[
          s.token,
          {
            left: acquisition.source.x - 30,
            top: acquisition.source.y - 30,
            borderColor: look.color,
            opacity: progress.interpolate({
              inputRange: [0, 0.08, 0.91, 1],
              outputRange: [0.5, 1, 1, 0],
            }),
            transform: [
              { translateX },
              { translateY },
              {
                scale: progress.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: reduced
                    ? [0.7, 0.7, 0.7, 0.7]
                    : [0.85, 1.3, 0.9, 0.5],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            s.orbit,
            {
              borderColor: look.color,
              transform: [
                {
                  rotate: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["-30deg", reduced ? "-30deg" : "150deg"],
                  }),
                },
              ],
            },
          ]}
        />
        <GeometryIcon id={acquisition.key.split(":").pop()!} size={48} />
      </Animated.View>
      <View testID="acquisition-status" style={s.caption}>
        <Text style={[s.captionLabel, { color: look.color }]}>
          {getLanguage() === "es"
            ? "EQUIPANDO EN EL ARSENAL"
            : "EQUIPPING IN THE ARSENAL"}
        </Text>
        <Text style={s.name}>{look.name}</Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  token: {
    position: "absolute",
    width: 60,
    height: 60,
    backgroundColor: "#0d1925",
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7ec6e0",
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  orbit: {
    position: "absolute",
    top: -10,
    bottom: -10,
    left: -10,
    right: -10,
    borderWidth: 1,
    borderRadius: 22,
    opacity: 0.65,
  },
  symbol: { fontSize: 37, fontWeight: "800" },
  caption: {
    position: "absolute",
    bottom: 40,
    left: 22,
    right: 22,
    alignItems: "center",
    backgroundColor: "#0b131ff2",
    borderRadius: 12,
    padding: 14,
    gap: 5,
  },
  captionLabel: { fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  name: { fontSize: 14, color: "#f4ece0", fontWeight: "700" },
});
