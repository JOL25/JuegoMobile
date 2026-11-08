import React, { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Canvas, Circle, Path, Skia } from "@shopify/react-native-skia";
import { getLanguage, t } from "../game/ui/i18n.js";
import { nativeDriver, useReducedMotion } from "./Motion";
import { VisualPressable } from "./VisualPressable";

const words = (es: string, en: string) => (getLanguage() === "es" ? es : en);
export const runTime = (n: number) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
function poly(radius: number, sides: number, cx = 100, cy = 100) {
  const builder = Skia.PathBuilder.Make();
  for (let i = 0; i < sides; i++) {
    const a = (i * Math.PI * 2) / sides - Math.PI / 2;
    if (!i)
      builder.moveTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    else builder.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
  }
  builder.close();
  const path = builder.detach();
  builder.dispose();
  return path;
}
const hex = poly(84, 6),
  triangle = poly(18, 3, 100, 22),
  diamond = poly(10, 4, 180, 115);
const pointer = Skia.Path.MakeFromSVGString(
  "M90 90 L115 100 L90 110 L96 100 Z",
)!;

export function HeroSigil({ size = 190 }: { size?: number }) {
  const reduced = useReducedMotion();
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: nativeDriver,
        isInteraction: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, reduced]);
  return (
    <View
      pointerEvents="none"
      style={{ width: size, height: size, alignSelf: "center" }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              {
                rotate: spin.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          },
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          <Path
            path={hex}
            color="#d9ad5b"
            style="stroke"
            strokeWidth={0.8}
            transform={[{ scale: size / 200 }]}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size * 0.34}
            color="#78c7cf55"
            style="stroke"
            strokeWidth={1}
          />
          <Path
            path={triangle}
            color="#e7b95d"
            transform={[{ scale: size / 200 }]}
          />
          <Path
            path={diamond}
            color="#8ad3d4"
            transform={[{ scale: size / 200 }]}
          />
        </Canvas>
      </Animated.View>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={size * 0.2} color="#d7cba9" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.23}
          color="#e7b95d88"
          style="stroke"
          strokeWidth={1}
        />
        <Path
          path={pointer}
          color="#141a21"
          transform={[{ scale: size / 200 }]}
        />
      </Canvas>
    </View>
  );
}

export function MenuIdentity({
  best,
  compact,
}: {
  best: number;
  compact: boolean;
}) {
  return (
    <View style={s.identity}>
      <View style={s.overline}>
        <View style={s.line} />
        <Text style={s.eyebrow}>GEOMETRIC SURVIVAL</Text>
        <View style={s.line} />
      </View>
      <HeroSigil size={compact ? 126 : 184} />
      <View>
        <Text style={s.circleTitle}>CIRCLE</Text>
        <Text style={s.geometryTitle}>VS GEOMETRY</Text>
      </View>
      <Text style={s.tagline}>
        {words(
          "Una forma. Infinitas posibilidades.",
          "One shape. Infinite possibilities.",
        )}
      </Text>
      <View style={s.menuStats}>
        <View style={s.menuStat}>
          <Text style={s.caption}>{words("MEJOR PARTIDA", "BEST RUN")}</Text>
          <Text style={s.statValue}>{runTime(best)}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.menuStat}>
          <Text style={s.caption}>
            {words("TU OBJETIVO", "YOUR OBJECTIVE")}
          </Text>
          <Text style={s.objective}>
            {words("Sobrevivir. Evolucionar.", "Survive. Evolve.")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Meter({
  value,
  color,
  height = 5,
}: {
  value: number;
  color: string;
  height?: number;
}) {
  const [progress] = useState(() => new Animated.Value(value));
  const reduced = useReducedMotion();
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: Math.max(0, Math.min(1, value)),
      duration: reduced ? 0 : 180,
      useNativeDriver: false,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [value, progress, reduced]);
  return (
    <View style={[s.meter, { height }]}>
      <Animated.View
        style={{
          height,
          backgroundColor: color,
          width: progress.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
        }}
      />
    </View>
  );
}
export function RunHud({
  player,
  top,
  left,
  right,
  onPause,
  compact = false,
}: {
  player: any;
  top: number;
  left: number;
  right: number;
  onPause: () => void;
  compact?: boolean;
}) {
  return (
    <View pointerEvents="box-none" style={[s.hud, { top, left, right }]}>
      <View style={[s.hudTop, compact && { gap: 8 }]}>
        <View
          pointerEvents="none"
          style={[s.levelSeal, compact && { width: 36, height: 36 }]}
        >
          <Text style={s.caption}>{words("NIVEL", "LEVEL")}</Text>
          <Text style={[s.levelNumber, compact && { fontSize: 17 }]}>
            {String(player.level).padStart(2, "0")}
          </Text>
        </View>
        <View pointerEvents="none" style={s.clock}>
          <Text style={s.caption}>
            {words("TIEMPO EN LA ARENA", "TIME IN THE ARENA")}
          </Text>
          <Text testID="timer" style={[s.timer, compact && { fontSize: 20 }]}>
            {runTime(player.survivalTime)}
          </Text>
        </View>
        <VisualPressable
          testID="pause"
          accessibilityRole="button"
          accessibilityLabel={t("Pausar")}
          accent="#5e747c"
          onPress={onPause}
          style={[s.pause, compact && { width: 36, height: 36 }]}
        >
          <View style={s.pauseBars}>
            <View style={s.pauseBar} />
            <View style={s.pauseBar} />
          </View>
        </VisualPressable>
      </View>
      <View
        testID="health-panel"
        pointerEvents="none"
        style={[s.vitals, compact && { paddingVertical: 5, gap: 3 }]}
      >
        <View style={s.split}>
          <Text style={s.hpLabel}>{words("INTEGRIDAD", "INTEGRITY")}</Text>
          <Text style={s.numeric}>
            {Math.ceil(player.hp)}
            <Text style={s.subtle}> / {player.maxHp}</Text>
            <Text style={s.killCount}> ◆ {player.kills}</Text>
          </Text>
        </View>
        <Meter
          value={player.hp / player.maxHp}
          color={player.hp / player.maxHp < 0.3 ? "#ff6868" : "#d28087"}
          height={6}
        />
        <View style={s.xpRow}>
          <Text style={s.xpLabel}>{words("EVOLUCIÓN", "EVOLUTION")}</Text>
          <Text style={s.xpLabel}>
            {player.xp} / {player.xpToNext}
          </Text>
        </View>
        <Meter value={player.xp / player.xpToNext} color="#83cfd3" height={3} />
      </View>
    </View>
  );
}
export function LevelUpHeading({
  level,
  pending,
  compact = false,
}: {
  level: number;
  pending: number;
  compact?: boolean;
}) {
  return (
    <View
      style={[s.levelHeading, compact && { gap: 3, marginBottom: 2 }]}
      testID="level-up-heading"
    >
      {!compact && (
        <View style={s.overline}>
          <View style={s.line} />
          <Text style={s.eyebrow}>
            {words("EVOLUCIÓN", "EVOLUTION")} / {String(level).padStart(2, "0")}
          </Text>
          <View style={s.line} />
        </View>
      )}
      <Text style={[s.heading, compact && { fontSize: 20 }]}>
        {words("Elige tu geometría", "Choose your geometry")}
      </Text>
      {!compact && (
        <Text style={s.description}>
          {words(
            "Una elección cambia tu trayectoria.",
            "One choice changes your trajectory.",
          )}
        </Text>
      )}
      <Text style={s.hint}>
        {pending > 1
          ? words(
              `${pending} elecciones pendientes · combate en pausa`,
              `${pending} choices pending · combat paused`,
            )
          : words(
              "ELIGE 1 MEJORA · COMBATE EN PAUSA",
              "CHOOSE 1 UPGRADE · COMBAT PAUSED",
            )}
      </Text>
    </View>
  );
}
export function RunSummary({
  player,
  time,
  kills,
  level,
}: {
  player: any;
  time: number;
  kills: number;
  level: number;
}) {
  return (
    <View style={s.summary}>
      <View style={s.summaryTop}>
        <Text style={s.caption}>
          {words("TU TRAYECTORIA", "YOUR TRAJECTORY")}
        </Text>
        <Text style={s.summaryTime}>{runTime(time)}</Text>
      </View>
      <View style={s.summaryGrid}>
        {[
          [String(level), words("NIVEL", "LEVEL")],
          [String(kills), words("DERROTADOS", "DEFEATED")],
          [
            String(
              player.weapons.length +
                player.passives.length +
                (player.ultimate ? 1 : 0),
            ),
            words("MEJORAS EQUIPADAS", "EQUIPPED UPGRADES"),
          ],
        ].map(([value, name]) => (
          <View key={name} style={s.summaryCell}>
            <Text style={s.summaryValue}>{value}</Text>
            <Text style={s.summaryLabel}>{name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  identity: { gap: 13, alignItems: "stretch" },
  overline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    justifyContent: "center",
  },
  line: { height: 1, flex: 1, maxWidth: 64, backgroundColor: "#d9ad5b44" },
  eyebrow: {
    color: "#d9ad5b",
    fontSize: 10,
    letterSpacing: 2.8,
    fontWeight: "700",
  },
  circleTitle: {
    fontSize: 29,
    color: "#e6ddc9",
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 9,
  },
  geometryTitle: {
    fontSize: 33,
    color: "#f6eddb",
    textAlign: "center",
    fontWeight: "900",
    letterSpacing: -1,
  },
  tagline: {
    textAlign: "center",
    fontSize: 13,
    color: "#b4bebd",
    lineHeight: 20,
  },
  menuStats: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#d9ad5b30",
    borderRadius: 12,
    padding: 15,
    marginVertical: 7,
    backgroundColor: "#101923dd",
  },
  menuStat: { flex: 1, gap: 7, justifyContent: "center" },
  statDivider: { width: 1, backgroundColor: "#d9ad5b22", marginHorizontal: 14 },
  caption: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#8da6aa",
  },
  statValue: {
    color: "#e6c27e",
    fontSize: 25,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  objective: { color: "#ece3d0", fontSize: 12, fontWeight: "600" },
  hud: { position: "absolute", gap: 7 },
  hudTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelSeal: {
    width: 49,
    height: 49,
    borderWidth: 1,
    borderColor: "#d9ad5b99",
    borderRadius: 11,
    backgroundColor: "#141c25ef",
    justifyContent: "center",
    alignItems: "center",
    gap: 1,
  },
  levelNumber: { color: "#e9c67e", fontSize: 22, fontWeight: "800" },
  clock: { flex: 1, alignItems: "center", gap: 2 },
  timer: {
    color: "#f1e7d1",
    fontSize: 27,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
  },
  pause: {
    width: 43,
    height: 43,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141d27ed",
  },
  pauseBars: { flexDirection: "row", gap: 4 },
  pauseBar: {
    width: 3,
    height: 14,
    backgroundColor: "#e6ddc9",
    borderRadius: 1,
  },
  vitals: {
    backgroundColor: "#101923ed",
    borderRadius: 8,
    padding: 9,
    gap: 5,
    borderWidth: 1,
    borderColor: "#40525c55",
  },
  split: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hpLabel: {
    color: "#dca3a5",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  numeric: { fontSize: 10, color: "#f1e7d1", fontWeight: "700" },
  subtle: { color: "#82969c" },
  killCount: { color: "#dfba70" },
  meter: { borderRadius: 4, backgroundColor: "#303944", overflow: "hidden" },
  xpRow: { flexDirection: "row", justifyContent: "space-between" },
  xpLabel: { color: "#83babe", fontSize: 8, letterSpacing: 1 },
  levelHeading: { gap: 9, marginBottom: 5 },
  heading: {
    color: "#f1e7d1",
    fontSize: 29,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.8,
  },
  description: { color: "#9db0b5", fontSize: 12, textAlign: "center" },
  hint: {
    color: "#829da1",
    fontSize: 8,
    letterSpacing: 1.2,
    textAlign: "center",
    marginTop: 4,
  },
  summary: {
    borderWidth: 1,
    borderColor: "#d9ad5b44",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#131d28ed",
  },
  summaryTop: { alignItems: "center", gap: 9, padding: 20 },
  summaryTime: {
    color: "#e6c27e",
    fontSize: 49,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  summaryGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#d9ad5b22",
  },
  summaryCell: { flex: 1, paddingVertical: 15, alignItems: "center", gap: 5 },
  summaryValue: { color: "#f1e7d1", fontSize: 23, fontWeight: "700" },
  summaryLabel: {
    color: "#8da6aa",
    fontSize: 7,
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
