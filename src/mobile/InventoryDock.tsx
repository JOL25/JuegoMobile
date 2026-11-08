import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { t, getLanguage } from "../game/ui/i18n.js";
import { inventoryEntries, itemLook } from "./visualItems.js";
import { GeometryIcon } from "./GeometryIcon";
import { nativeDriver, useReducedMotion } from "./Motion";

export type MeasuredView = React.ComponentRef<typeof View>;
export type SlotRegistry = React.RefObject<Map<string, MeasuredView>>;
export type Arrival = { key: string; token: number } | null;
function Slot({
  item,
  register,
  arrival,
  compact,
}: {
  item: any;
  register: (node: MeasuredView | null) => void;
  arrival: Arrival;
  compact?: boolean;
}) {
  const [flash] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  const look = itemLook(item.id);
  useEffect(() => {
    if (arrival?.key !== item.key) return;
    flash.setValue(1);
    const animation = Animated.timing(flash, {
      toValue: 0,
      duration: reduced ? 120 : 650,
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [arrival, item.key, flash, reduced]);
  return (
    <View
      ref={register}
      collapsable={false}
      testID={`slot-${item.key}`}
      accessible
      accessibilityLabel={`${t(item.name)} · ${item.level}`}
      style={[
        s.slot,
        compact && { width: 32, height: 32 },
        { borderColor: item.preview ? look.color : `${look.color}55` },
        item.preview && s.preview,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          s.flash,
          {
            backgroundColor: look.color,
            opacity: flash.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.75],
            }),
            transform: [
              {
                scale: flash.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.6],
                }),
              },
            ],
          },
        ]}
      />
      {item.preview ? (
        <Text style={[s.symbol, { color: look.color }]}>＋</Text>
      ) : (
        <GeometryIcon id={item.id} size={compact ? 26 : 32} />
      )}
      <Text style={s.level}>{item.level}</Text>
    </View>
  );
}
export function InventoryDock({
  player,
  preview,
  slots,
  arrival,
  top,
  left,
  right,
  compact = false,
}: {
  player: any;
  preview: any;
  slots: SlotRegistry;
  arrival: Arrival;
  top: number;
  left: number;
  right: number;
  compact?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      testID="inventory-dock"
      style={[s.dock, { top, left, right }]}
    >
      <Text style={s.label}>
        {getLanguage() === "es"
          ? "TU GEOMETRÍA / INVENTARIO"
          : "YOUR GEOMETRY / INVENTORY"}
      </Text>
      <View style={[s.row, compact && { gap: 4 }]}>
        {inventoryEntries(player, preview).map((item) => (
          <Slot
            key={item.key}
            compact={compact}
            item={item}
            arrival={arrival}
            register={(node) => {
              if (node) slots.current.set(item.key, node);
              else slots.current.delete(item.key);
            }}
          />
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  dock: { position: "absolute", zIndex: 30, gap: 7 },
  label: { color: "#99aebc", letterSpacing: 2, fontSize: 9, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  slot: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#111c27f5",
    alignItems: "center",
    justifyContent: "center",
  },
  symbol: { fontSize: 23, fontWeight: "700", lineHeight: 28 },
  level: {
    position: "absolute",
    right: 2,
    bottom: 0,
    color: "#f4ece0",
    fontSize: 9,
    fontWeight: "800",
  },
  preview: { borderStyle: "dashed", backgroundColor: "#273544" },
  flash: {
    position: "absolute",
    top: -4,
    bottom: -4,
    left: -4,
    right: -4,
    borderRadius: 10,
  },
});
