import React, { useEffect, useState, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { t } from "../game/ui/i18n.js";
import { nativeDriver, useReducedMotion } from "./Motion";
import { VisualPressable } from "./VisualPressable";
import { upgradeDestination, upgradeLook } from "./visualItems.js";

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
}: {
  option: Upgrade;
  index: number;
  selected: string | null;
  locked: boolean;
  onSelect: (option: Upgrade, source: Point) => void;
}) {
  const icon = useRef<React.ComponentRef<typeof View>>(null);
  const [entry] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  const look = upgradeLook(option);
  const chosen = selected === upgradeDestination(option);
  useEffect(() => {
    entry.setValue(0);
    const animation = Animated.timing(entry, {
      toValue: 1,
      duration: reduced ? 0 : 340,
      delay: reduced ? 0 : index * 85,
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [entry, index, reduced, option]);
  return (
    <Animated.View
      style={{
        opacity: locked && !chosen ? 0.3 : entry,
        transform: [
          {
            translateY: entry.interpolate({
              inputRange: [0, 1],
              outputRange: [reduced ? 0 : 24, 0],
            }),
          },
        ],
      }}
    >
      <VisualPressable
        testID={`upgrade-${index}`}
        accessibilityRole="button"
        accessibilityLabel={`${option.title}. ${option.description}`}
        accent={look.color}
        disabled={locked}
        style={[
          s.card,
          chosen && { backgroundColor: "#293b47", borderColor: "#f4ece0" },
        ]}
        onPress={() =>
          icon.current?.measureInWindow((x, y, width, height) =>
            onSelect(option, { x: x + width / 2, y: y + height / 2 }),
          )
        }
      >
        <View style={s.header}>
          <View
            ref={icon}
            collapsable={false}
            style={[s.icon, { borderColor: look.color }]}
          >
            <Text style={[s.symbol, { color: look.color }]}>{look.symbol}</Text>
          </View>
          <View style={s.names}>
            <Text style={[s.category, { color: look.color }]}>
              {option.kind.startsWith("weapon")
                ? t("Arma")
                : option.kind.startsWith("ultimate")
                  ? t("Definitiva")
                  : option.kind.startsWith("passive")
                    ? t("Pasiva")
                    : option.kind === "heal"
                      ? t("Curación")
                      : "DASH"}
            </Text>
            <Text style={s.title}>{option.title}</Text>
          </View>
          <Text style={[s.number, { color: look.color }]}>0{index + 1}</Text>
        </View>
        <Text style={s.description}>{option.description}</Text>
        <View style={s.footer}>
          <Text style={[s.choose, { color: look.color }]}>
            {chosen ? "✓" : t("ELEGIR")}
          </Text>
          <Text style={{ color: look.color }}>━━ {chosen ? "◆" : "➜"}</Text>
        </View>
      </VisualPressable>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  card: { padding: 16, gap: 10, backgroundColor: "#121e2aeF", minHeight: 142 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 11,
    backgroundColor: "#0a121c",
    alignItems: "center",
    justifyContent: "center",
  },
  symbol: { fontSize: 30, fontWeight: "700" },
  names: { flex: 1, gap: 3 },
  category: {
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: { color: "#f4ece0", fontSize: 17, fontWeight: "800" },
  number: { fontSize: 12, opacity: 0.5, fontVariant: ["tabular-nums"] },
  description: { color: "#adbcc8", fontSize: 12, lineHeight: 19 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#ffffff12",
    paddingTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  choose: { fontSize: 10, fontWeight: "900", letterSpacing: 2 },
});
