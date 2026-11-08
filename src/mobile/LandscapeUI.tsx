import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { ENEMY_TYPES } from "../game/entities/Enemy.js";
import { t, getLanguage } from "../game/ui/i18n.js";
import { HeroSigil, runTime } from "./RogueUI";
import { VisualPressable } from "./VisualPressable";
import { nativeDriver, useReducedMotion } from "./Motion";
import { announcementText } from "./announcements.js";

const words = (es: string, en: string) => (getLanguage() === "es" ? es : en);
function MenuButton({
  title,
  action,
  primary,
  testID,
}: {
  title: string;
  action: () => void;
  primary?: boolean;
  testID?: string;
}) {
  return (
    <VisualPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accent={primary ? "#e8b13a" : "#536b77"}
      ready={primary}
      onPress={action}
      style={[s.button, primary && s.primary]}
    >
      <Text style={[s.buttonText, primary && { color: "#111a22" }]}>
        {title}
      </Text>
    </VisualPressable>
  );
}
export function LandscapeHome({
  best,
  height,
  onStart,
  onOptions,
  persistent,
}: {
  best: number;
  height: number;
  onStart: () => void;
  onOptions: () => void;
  persistent: boolean;
}) {
  return (
    <View testID="landscape-home" style={s.home}>
      <View style={s.identity}>
        <Text style={s.kicker}>GEOMETRIC SURVIVAL</Text>
        <HeroSigil size={height < 360 ? 106 : 142} />
        <Text style={s.brand}>CIRCLE</Text>
        <Text style={s.title}>VS GEOMETRY</Text>
        <Text style={s.tagline}>
          {words(
            "Una forma. Infinitas posibilidades.",
            "One shape. Infinite possibilities.",
          )}
        </Text>
      </View>
      <View style={s.homeActions}>
        <View style={s.record}>
          <Text style={s.kicker}>{words("MEJOR PARTIDA", "BEST RUN")}</Text>
          <Text style={s.best}>{runTime(best)}</Text>
        </View>
        <MenuButton
          title={t("Empezar")}
          action={onStart}
          primary
          testID="start"
        />
        <MenuButton title={t("Opciones")} action={onOptions} />
        <Text style={s.footnote}>
          {words(
            "Arrastra para moverte · Disparo automático",
            "Drag to move · Automatic fire",
          )}
        </Text>
        {!persistent && (
          <Text style={s.footnote}>
            {words(
              "Guardado disponible solo en esta sesión.",
              "Saving is available for this session only.",
            )}
          </Text>
        )}
      </View>
    </View>
  );
}
export function LandscapeOptions({
  volume,
  onVolume,
  onLanguage,
  onBack,
}: {
  volume: number;
  onVolume: (value: number) => void;
  onLanguage: (value: string) => void;
  onBack: () => void;
}) {
  return (
    <View style={s.options}>
      <Text style={s.heading}>{t("Opciones")}</Text>
      <View style={s.optionGroups}>
        <View style={s.optionGroup}>
          <Text style={s.label}>{t("Idioma")}</Text>
          <View style={s.choices}>
            {["es", "en"].map((lang) => (
              <VisualPressable
                key={lang}
                accessibilityRole="button"
                accessibilityLabel={lang === "es" ? "Español" : "English"}
                accent={getLanguage() === lang ? "#e8b13a" : "#536b77"}
                onPress={() => onLanguage(lang)}
                style={s.choice}
              >
                <Text style={s.buttonText}>
                  {lang === "es" ? "Español" : "English"}
                </Text>
              </VisualPressable>
            ))}
          </View>
        </View>
        <View style={s.optionGroup}>
          <Text style={s.label}>
            {t("Sonido:")} {Math.round(volume * 100)}%
          </Text>
          <View style={s.choices}>
            {[0, 0.3, 0.6, 1].map((value) => (
              <VisualPressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${Math.round(value * 100)}%`}
                accent={volume === value ? "#e8b13a" : "#536b77"}
                onPress={() => onVolume(value)}
                style={s.volume}
              >
                <Text style={s.buttonText}>{Math.round(value * 100)}%</Text>
              </VisualPressable>
            ))}
          </View>
        </View>
      </View>
      <View style={{ width: 230, alignSelf: "center" }}>
        <MenuButton title={t("Volver")} action={onBack} />
      </View>
    </View>
  );
}

const enemyPaths = new Map<string, ReturnType<typeof Skia.Path.Make>>();
for (const type of Object.values(ENEMY_TYPES)) {
  const builder = Skia.PathBuilder.Make();
  type.vertices.forEach(([x, y], index) => {
    if (index) builder.lineTo(18 + x * 13, 18 + y * 13);
    else builder.moveTo(18 + x * 13, 18 + y * 13);
  });
  builder.close();
  enemyPaths.set(type.id, builder.detach());
  builder.dispose();
}
export function EncounterBanner({
  game,
  top,
  left,
  width,
}: {
  game: any;
  top: number;
  left: number;
  width: number;
}) {
  const current = game.spawner.announcement;
  const special = game.powerUpSpawner.announcementAge !== null;
  const reduced = useReducedMotion();
  const [entry] = useState(() => new Animated.Value(reduced ? 1 : 0));
  const key = special ? "powerups" : current?.type.id;
  useEffect(() => {
    entry.setValue(reduced ? 1 : 0);
    const animation = Animated.timing(entry, {
      toValue: 1,
      duration: reduced ? 0 : 220,
      useNativeDriver: nativeDriver,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [entry, key, reduced]);
  if (!current && !special) return null;
  const age = special ? game.powerUpSpawner.announcementAge : current.age;
  return (
    <Animated.View
      testID="encounter-banner"
      pointerEvents="none"
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={announcementText(game)}
      style={[
        s.banner,
        {
          top,
          left,
          width,
          opacity: entry,
          transform: [
            {
              translateY: entry.interpolate({
                inputRange: [0, 1],
                outputRange: [reduced ? 0 : -14, 0],
              }),
            },
          ],
        },
      ]}
    >
      {!special && enemyPaths.get(current.type.id) ? (
        <Canvas style={{ width: 36, height: 36 }}>
          <Path
            path={enemyPaths.get(current.type.id)!}
            color={current.type.color}
          />
          <Path
            path={enemyPaths.get(current.type.id)!}
            color="#f4dfae"
            style="stroke"
            strokeWidth={1.5}
          />
        </Canvas>
      ) : (
        <Text style={s.special}>◆</Text>
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.kicker}>
          {words("ALERTA DE LA ARENA", "ARENA ALERT")}
        </Text>
        <Text style={s.message}>{announcementText(game)}</Text>
      </View>
      <View style={s.duration}>
        <View
          style={{
            width: 2,
            height: Math.max(2, 32 * Math.max(0, 1 - age / 4)),
            backgroundColor: "#e8b13a",
          }}
        />
      </View>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  home: { flexDirection: "row", gap: 38, alignItems: "center", width: "100%" },
  identity: { flex: 1, alignItems: "center", gap: 5 },
  kicker: {
    color: "#d9ad5b",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  brand: {
    color: "#e6ddc9",
    fontSize: 21,
    letterSpacing: 7,
    fontWeight: "600",
  },
  title: {
    color: "#f4e9d5",
    fontSize: 28,
    letterSpacing: -1,
    fontWeight: "900",
    textAlign: "center",
  },
  tagline: { color: "#9bafbd", fontSize: 11, textAlign: "center" },
  homeActions: { flex: 1, maxWidth: 350, gap: 11 },
  record: {
    backgroundColor: "#131e29ed",
    borderColor: "#d9ad5b33",
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  best: { fontSize: 24, color: "#e6c27e", fontWeight: "800" },
  button: {
    minHeight: 48,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#152130",
  },
  primary: { backgroundColor: "#e8b13a" },
  buttonText: { color: "#f4ece0", fontSize: 13, fontWeight: "800" },
  footnote: {
    color: "#9bafbd",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
  },
  options: { gap: 20 },
  heading: {
    color: "#f4ece0",
    textAlign: "center",
    fontSize: 26,
    fontWeight: "800",
  },
  optionGroups: { flexDirection: "row", gap: 24 },
  optionGroup: { flex: 1, gap: 12 },
  label: { color: "#9bafbd", fontSize: 13, textAlign: "center" },
  choices: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  volume: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    position: "absolute",
    zIndex: 80,
    elevation: 80,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d9ad5b99",
    backgroundColor: "#111c28fa",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  message: {
    color: "#f2d38e",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  special: { color: "#e8b13a", fontSize: 26 },
  duration: {
    width: 2,
    height: 32,
    justifyContent: "flex-end",
    backgroundColor: "#d9ad5b22",
  },
});
