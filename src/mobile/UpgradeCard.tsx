import React, { useEffect, useState, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { getLanguage } from "../game/ui/i18n.js";
import { nativeDriver, useReducedMotion } from "./Motion";
import { VisualPressable } from "./VisualPressable";
import { GeometryIcon } from "./GeometryIcon";
import {
  upgradeDestination,
  upgradeLook,
  upgradeDisplay,
} from "./visualItems.js";

export type Upgrade = {
  kind: string;
  title: string;
  description: string;
  icon: string;
  onPick: () => void;
  [key: string]: any;
};
export type Point = { x: number; y: number };
export function UpgradeCard({
  option,
  index,
  selected,
  locked,
  onSelect,
  player,
}: {
  option: Upgrade;
  index: number;
  selected: string | null;
  locked: boolean;
  onSelect: (option: Upgrade, source: Point) => void;
  player?: any;
}) {
  const icon = useRef<React.ComponentRef<typeof View>>(null);
  const [entry] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  const look = upgradeLook(option);
  const display = upgradeDisplay(option, player);
  const en = getLanguage() === "en";
  const chosen = selected === upgradeDestination(option);
  useEffect(() => {
    entry.setValue(0);
    const animation = Animated.timing(entry, {
      toValue: 1,
      duration: reduced ? 0 : 360,
      delay: reduced ? 0 : index * 90,
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [entry, index, reduced, option]);
  return (
    <Animated.View
      style={{
        opacity: locked && !chosen ? 0.25 : entry,
        transform: [
          {
            translateY: entry.interpolate({
              inputRange: [0, 1],
              outputRange: [reduced ? 0 : 25, 0],
            }),
          },
        ],
      }}
    >
      <VisualPressable
        testID={`upgrade-${index}`}
        accessibilityRole="button"
        accessibilityLabel={`${display.name}. ${option.description}`}
        accent={look.color}
        disabled={locked}
        style={[
          s.card,
          chosen && { backgroundColor: "#24343b", borderColor: "#f1e7d1" },
        ]}
        onPress={() =>
          icon.current?.measureInWindow((x, y, width, height) =>
            onSelect(option, { x: x + width / 2, y: y + height / 2 }),
          )
        }
      >
        <View style={s.top}>
          <Text style={[s.kind, { color: look.color }]}>
            {display.kindLabel}{" "}
            <Text style={s.family}> / {display.family}</Text>
          </Text>
          <Text style={[s.badge, { color: look.color }]}>
            {display.isNew
              ? en
                ? "NEW"
                : "NUEVO"
              : option.kind === "heal"
                ? "+30 HP"
                : `${en ? "LV" : "NV"}. ${display.level} → ${display.nextLevel}`}
          </Text>
        </View>
        <View style={s.header}>
          <View
            ref={icon}
            collapsable={false}
            style={[s.iconWell, { borderColor: `${look.color}66` }]}
          >
            <GeometryIcon id={display.id ?? "health"} size={54} />
          </View>
          <View style={s.names}>
            <Text style={s.title}>{display.name}</Text>
            <Text style={s.tagline}>{display.tagline}</Text>
          </View>
        </View>
        <View style={s.stats}>
          {display.stats
            .filter(
              (stat: { after: string }) =>
                !display.isNew || !["0", "0 cm", "No"].includes(stat.after),
            )
            .map(
              (
                stat: { label: string; before?: string; after: string },
                i: number,
              ) => (
                <View key={`${stat.label}-${i}`} style={s.stat}>
                  <Text style={s.statLabel}>{stat.label}</Text>
                  <Text style={s.after}>
                    {stat.before && stat.before !== stat.after ? (
                      <Text style={s.before}>
                        {stat.before}{" "}
                        <Text style={{ color: look.color }}>→ </Text>
                      </Text>
                    ) : null}
                    {stat.after}
                  </Text>
                </View>
              ),
            )}
        </View>
        <View style={s.footer}>
          <View style={s.pips}>
            {display.maxLevel ? (
              Array.from({ length: Math.min(8, display.maxLevel) }, (_, i) => (
                <View
                  key={i}
                  style={[
                    s.pip,
                    {
                      backgroundColor:
                        i < display.level
                          ? look.color
                          : i < display.nextLevel
                            ? `${look.color}88`
                            : "#34434c",
                      borderColor:
                        i === display.nextLevel - 1
                          ? look.color
                          : "transparent",
                      borderWidth: 1,
                    },
                  ]}
                />
              ))
            ) : (
              <Text style={s.repair}>
                {en ? "RESTORE INTEGRITY" : "RESTAURA TU INTEGRIDAD"}
              </Text>
            )}
          </View>
          <Text style={[s.choose, { color: look.color }]}>
            {chosen
              ? en
                ? "EQUIPPING…"
                : "EQUIPANDO…"
              : en
                ? "CHOOSE"
                : "ELEGIR"}{" "}
            ↗
          </Text>
        </View>
      </VisualPressable>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: "#141e29f5",
    padding: 15,
    gap: 12,
    borderRadius: 14,
    borderBottomWidth: 2,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  kind: { fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  family: { color: "#859da3", fontWeight: "500", letterSpacing: 0.8 },
  badge: { fontSize: 9, letterSpacing: 0.7, fontWeight: "800" },
  header: { flexDirection: "row", gap: 13, alignItems: "center" },
  iconWell: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#0a121b",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  names: { flex: 1, gap: 5 },
  title: {
    color: "#f1e7d1",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  tagline: { fontSize: 11, lineHeight: 16, color: "#a5b5b8" },
  stats: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    backgroundColor: "#0a121b88",
    padding: 9,
    borderRadius: 6,
  },
  stat: { flexGrow: 1, minWidth: "27%", gap: 3 },
  statLabel: { color: "#819da3", fontSize: 8, letterSpacing: 0.3 },
  after: { color: "#ebdfc7", fontSize: 11, fontWeight: "700" },
  before: { color: "#6e858e", fontWeight: "400" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
    gap: 7,
  },
  pips: { flexDirection: "row", gap: 4 },
  pip: { width: 8, height: 5, borderRadius: 1 },
  choose: { fontSize: 9, letterSpacing: 1.5, fontWeight: "800" },
  repair: { fontSize: 8, letterSpacing: 0.7, color: "#c28b91" },
});
