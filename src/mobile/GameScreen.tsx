import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import {
  LandscapeHome,
  LandscapeOptions,
  EncounterBanner,
} from "./LandscapeUI";
import { StatusBar } from "expo-status-bar";
import { Game, STATE } from "../game/core/Game.js";
import { WorldRenderer } from "../game/rendering/WorldRenderer.js";
import { storage } from "../game/storage.js";
import { getLanguage, setLanguage, t } from "../game/ui/i18n.js";
import { TouchInput } from "./TouchInput.js";
import { MenuBridge } from "./MenuBridge.js";
import { NativeSound } from "./NativeSound";
import { hydrateStorage, flushStorage } from "./persistence";
import { GameCanvas } from "./GameCanvas";
import { VisualPressable } from "./VisualPressable";
import { MotionProvider, useReducedMotion } from "./Motion";
import { InventoryDock, type Arrival } from "./InventoryDock";
import { UpgradeCard, type Upgrade, type Point } from "./UpgradeCard";
import { AcquisitionFlight, type Acquisition } from "./AcquisitionFlight";
import { inventoryEntries, upgradeDestination } from "./visualItems.js";
import { MenuIdentity, RunHud, LevelUpHeading, RunSummary } from "./RogueUI";
import { GeometryIcon } from "./GeometryIcon";
import { ACTION_LAYOUT, actionAtPoint, actionMetrics } from "./touchLayout.js";

type Runtime = { game: any; input: TouchInput; sound: NativeSound };
type Menu = {
  screen: string;
  options?: Upgrade[];
  stats?: { level: number; time: number; kills: number; isHighScore: boolean };
};
const label = (es: string, en: string) => (getLanguage() === "es" ? es : en);
const colors = {
  bg: "#0b111c",
  card: "#152130",
  border: "#3a5063",
  gold: "#e8b13a",
  ink: "#f4ece0",
  muted: "#9bafbd",
  blue: "#7ec6e0",
};

function Button({
  title,
  onPress,
  secondary = false,
  testID,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  testID?: string;
  compact?: boolean;
}) {
  return (
    <VisualPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      accent={secondary ? colors.border : colors.gold}
      ready={!secondary}
      style={[s.button, secondary && s.secondary, compact && s.buttonSmall]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.ink }]}>
        {title}
      </Text>
      <Text
        pointerEvents="none"
        style={{
          position: "absolute",
          right: 18,
          color: secondary ? colors.blue : colors.bg,
          fontSize: 19,
        }}
      >
        {secondary ? "◇" : "➜"}
      </Text>
    </VisualPressable>
  );
}

function Screen() {
  "use no memo"; // HUD reads a mutable simulation, refreshed on a separate cadence.
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [menu, setMenu] = useState<Menu>({ screen: "menu" });
  const [options, setOptions] = useState(false);
  const [fatal, setFatal] = useState("");
  const [persistent, setPersistent] = useState(true);
  const size = useWindowDimensions();
  const landscape = size.width > size.height && size.width >= 560;
  const safeWidth = size.width - insets.left - insets.right;
  const touchTop =
    insets.top + (landscape ? Math.min(130, size.height * 0.33) : 190);
  useEffect(() => {
    if (Platform.OS !== "web")
      void ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      ).catch(() => {});
  }, []);
  const [, refresh] = useState(0);
  const [stick, setStick] = useState<{
    x: number;
    y: number;
    dx: number;
    dy: number;
  } | null>(null);

  const slots = useRef(new Map<string, React.ComponentRef<typeof View>>());
  const selectionLock = useRef(false);
  const selectionToken = useRef(0);
  const [acquisition, setAcquisition] = useState<Acquisition | null>(null);
  const [arrival, setArrival] = useState<Arrival>(null);
  const completeAcquisition = useCallback(
    (selection: Acquisition) => {
      if (!selectionLock.current || selection.token !== selectionToken.current)
        return;
      const engine = runtime?.game;
      if (
        engine?.state === STATE.LEVEL_UP &&
        engine.menu.current.options?.includes(selection.option)
      ) {
        const hidden = engine.pageHidden;
        selection.option.onPick();
        if (hidden && engine.state === STATE.PLAYING) engine.togglePause();
        setArrival({ key: selection.key, token: selection.token });
      }
      selectionLock.current = false;
      setAcquisition(null);
    },
    [runtime],
  );
  const chooseUpgrade = (option: Upgrade, source: Point) => {
    if (
      selectionLock.current ||
      runtime?.game.state !== STATE.LEVEL_UP ||
      !runtime.game.menu.current.options?.includes(option)
    )
      return;
    selectionLock.current = true;
    setAcquisition({
      option,
      source,
      key: upgradeDestination(option),
      token: ++selectionToken.current,
    });
  };

  useEffect(() => {
    runtime?.input.reset();
    const resetFrame = requestAnimationFrame(() => setStick(null));
    return () => cancelAnimationFrame(resetFrame);
  }, [runtime, size.width, size.height]);

  const onTick = useCallback(() => refresh((n) => n + 1), []);
  const onError = useCallback((message: string) => setFatal(message), []);
  useEffect(() => {
    runtime?.game.renderer.setReducedMotion(reducedMotion);
  }, [runtime, reducedMotion]);

  useEffect(() => {
    let cancelled = false;
    let sound: NativeSound | null = null;
    let game: any;
    void (async () => {
      const result = await hydrateStorage();
      if (cancelled) return;
      setPersistent(result.persistent);
      setLanguage(storage.getItem("vs_clone_language") ?? "es");
      sound = new NativeSound();
      await sound.init();
      if (cancelled) {
        sound.dispose();
        return;
      }
      const input = new TouchInput();
      const bridge = new (MenuBridge as any)((next: Menu) => {
        if (!cancelled) {
          input.reset();
          setStick(null);
          setMenu(next);
        }
      });
      const Engine: any = Game;
      game = new Engine(
        { width: 960, height: 540, getContext: () => null },
        {
          input,
          menu: bridge,
          sound,
          renderer: new WorldRenderer(),
        },
      );
      if (AppState.currentState && AppState.currentState !== "active")
        game.suspend();
      setRuntime({ game, input, sound });
      if (__DEV__ && process.env.EXPO_PUBLIC_QA === "1") {
        (globalThis as any).__JUEGO_QA__ = { game, input };
      }
    })().catch((error) => {
      if (!cancelled) setFatal(String(error));
    });
    return () => {
      cancelled = true;
      game?.suspend();
      sound?.dispose();
      void flushStorage();
    };
  }, []);

  useEffect(() => {
    if (!runtime) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") runtime.game.resume();
      else {
        runtime.game.suspend();
        setStick(null);
        void flushStorage();
      }
    });
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (options) {
        setOptions(false);
        return true;
      }
      if (runtime.game.state === STATE.PLAYING) {
        runtime.game.togglePause();
        return true;
      }
      return (
        runtime.game.state === STATE.LEVEL_UP ||
        runtime.game.state === STATE.PAUSED
      );
    });
    return () => {
      subscription.remove();
      back.remove();
    };
  }, [runtime, options]);

  const playing = menu.screen === "playing";
  const game = runtime?.game;
  const player = game?.player;
  const inventoryColumns = Math.max(
    1,
    Math.floor(
      (size.width - insets.left - insets.right - 26) / (landscape ? 36 : 46),
    ),
  );
  const inventoryRows = player
    ? Math.ceil((inventoryEntries(player).length + 1) / inventoryColumns)
    : 1;
  const actionAreas = actionMetrics({
    width: size.width,
    height: size.height,
    insets,
    landscape,
  });
  const resetStick = () => {
    runtime?.input.resetMovement();
    setStick(null);
  };
  const triggerAction = (action: "dash" | "ultimate") => {
    const current = runtime?.game?.player;
    if (!current) return;
    if (action === "dash") {
      if (current.dashCharges > 0) runtime.input.queueDash();
    } else if (current.ultimate?.isReady()) {
      runtime.input.queueUltimate();
    }
  };
  const touchStart = (event: GestureResponderEvent) => {
    if (!playing || !runtime) return;
    // Android reports every pointer of a gesture against the view under the
    // first finger. Recognise DASH/ULT here as well so pressing the joystick
    // first does not swallow the second finger.
    for (const touch of Array.from(event.nativeEvent.changedTouches)) {
      const action = actionAtPoint(touch.pageX, touch.pageY, actionAreas);
      if (action) {
        triggerAction(action);
        continue;
      }
      if (
        touch.pageX >= insets.left &&
        touch.pageX < actionAreas.ultimate.left &&
        touch.pageY >= touchTop &&
        touch.pageY <= size.height - insets.bottom &&
        runtime.input.begin(touch.identifier, touch.pageX, touch.pageY)
      ) {
        setStick({
          x: touch.pageX - insets.left,
          y: touch.pageY - touchTop,
          dx: 0,
          dy: 0,
        });
        // Another changed touch in this batch may target DASH or ULT.
        continue;
      }
    }
  };
  const touchMove = (event: GestureResponderEvent) => {
    if (!playing || !runtime) return;
    const p = Array.from(event.nativeEvent.touches).find(
      (p) => p.identifier === runtime.input.pointerId,
    );
    if (!p) return;
    runtime.input.drag(p.identifier, p.pageX, p.pageY);
    const vector = runtime.input.getMoveVector();
    setStick((old) => old && { ...old, dx: vector.x * 32, dy: vector.y * 32 });
  };
  const touchEnd = (event: GestureResponderEvent) => {
    if (
      Array.from(event.nativeEvent.changedTouches).some(
        (p) => p.identifier === runtime?.input.pointerId,
      )
    )
      resetStick();
  };

  if (fatal)
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.heading}>
          {label("No se pudo iniciar", "Unable to start")}
        </Text>
        <Text selectable style={s.copy}>
          {fatal}
        </Text>
      </View>
    );
  if (!runtime)
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={colors.gold} />
        <Text style={s.copy}>
          {label("Preparando la arena…", "Preparing the arena…")}
        </Text>
      </View>
    );

  return (
    <View
      style={s.root}
      onTouchStart={touchStart}
      onTouchMove={touchMove}
      onTouchEnd={touchEnd}
      onTouchCancel={touchEnd}
    >
      <StatusBar hidden />
      <GameCanvas
        game={game}
        width={size.width}
        height={size.height}
        onTick={onTick}
        onError={onError}
      />
      {playing && (
        <>
          <RunHud
            player={player}
            compact={landscape}
            top={insets.top + 8}
            left={insets.left + 16}
            right={
              landscape
                ? size.width -
                  insets.left -
                  16 -
                  Math.min(290, safeWidth * 0.36)
                : insets.right + 16
            }
            onPause={() => game.togglePause()}
          />
          <View
            testID="joystick-zone"
            style={[
              s.touchZone,
              Platform.OS === "web" && ({ touchAction: "none" } as any),
              {
                left: insets.left,
                bottom: insets.bottom,
                top: touchTop,
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                s.joystick,
                stick
                  ? { left: stick.x - 48, top: stick.y - 48 }
                  : { left: 30, bottom: 25 },
              ]}
            >
              <View
                style={[
                  s.knob,
                  {
                    transform: [
                      { translateX: stick?.dx ?? 0 },
                      { translateY: stick?.dy ?? 0 },
                    ],
                  },
                ]}
              />
            </View>
          </View>
          <View
            style={[
              s.actions,
              {
                right:
                  insets.right +
                  (landscape
                    ? ACTION_LAYOUT.margin.landscape
                    : ACTION_LAYOUT.margin.portrait),
                bottom:
                  insets.bottom +
                  (landscape
                    ? ACTION_LAYOUT.bottom.landscape
                    : ACTION_LAYOUT.bottom.portrait),
              },
            ]}
          >
            <VisualPressable
              testID="ultimate"
              accessibilityRole="button"
              round
              ready={!!player.ultimate?.isReady()}
              accent={colors.gold}
              accessibilityLabel={t("Usar definitiva")}
              disabled={!player.ultimate?.isReady()}
              onTouchStart={() => triggerAction("ultimate")}
              accessibilityActions={[
                { name: "activate", label: t("Usar definitiva") },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "activate")
                  triggerAction("ultimate");
              }}
              onAccessibilityTap={() => triggerAction("ultimate")}
              onPress={(event) => {
                if ((event.nativeEvent as any).detail === 0)
                  triggerAction("ultimate");
              }}
              style={[
                s.action,
                s.ultimate,
                !player.ultimate?.isReady() && s.disabled,
              ]}
            >
              <GeometryIcon id={player.ultimate?.id ?? "ult_wave"} size={25} />
              <Text style={s.actionTitle}>ULT</Text>
              <Text style={s.actionSub}>
                {!player.ultimate
                  ? "Nv. 5"
                  : player.ultimate.isReady()
                    ? label("LISTO", "READY")
                    : `${Math.ceil(player.ultimate.cooldownTimer / 1000)}s`}
              </Text>
            </VisualPressable>
            <VisualPressable
              testID="dash"
              accessibilityRole="button"
              round
              ready={player.dashCharges > 0}
              accent={colors.blue}
              accessibilityLabel={t("Usar dash")}
              disabled={player.dashCharges <= 0}
              onTouchStart={() => triggerAction("dash")}
              accessibilityActions={[
                { name: "activate", label: t("Usar dash") },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "activate")
                  triggerAction("dash");
              }}
              onAccessibilityTap={() => triggerAction("dash")}
              onPress={(event) => {
                if ((event.nativeEvent as any).detail === 0)
                  triggerAction("dash");
              }}
              style={[s.action, !player.dashCharges && s.disabled]}
            >
              <GeometryIcon id="dash" size={28} />
              <Text style={s.actionTitle}>DASH</Text>
              <Text testID="dash-charges" style={s.actionSub}>
                {player.dashCharges} / {player.dashMaxCharges}
              </Text>
            </VisualPressable>
          </View>
          <View
            pointerEvents="none"
            style={[
              s.notices,
              landscape
                ? {
                    bottom: insets.bottom + 10,
                    left: size.width * 0.3,
                    right: size.width * 0.3,
                  }
                : { bottom: insets.bottom + 140 },
            ]}
          >
            {!!game.onboarding.message && (
              <Text style={s.hint}>
                {t(
                  (
                    {
                      move: "Arrastra para moverte. Tus armas disparan solas.",
                      xp: "Recoge las gemas azules para subir de nivel y elegir mejoras.",
                      dash: "Pulsa DASH para esquivar sin soltar el joystick.",
                      ultimate: "¡Definitiva lista! Pulsa el botón ULT.",
                    } as Record<string, string>
                  )[game.onboarding.message],
                )}
              </Text>
            )}
          </View>
        </>
      )}
      {(playing || menu.screen === "level_up") && (
        <InventoryDock
          player={player}
          compact={landscape}
          preview={acquisition?.option ?? null}
          slots={slots}
          arrival={arrival}
          top={insets.top + (playing ? (landscape ? 103 : 135) : 12)}
          left={insets.left + 16}
          right={
            landscape && playing
              ? size.width - insets.left - 16 - Math.min(340, safeWidth * 0.46)
              : insets.right + 16
          }
        />
      )}
      {!playing && (
        <View
          style={[
            s.overlay,
            {
              paddingTop:
                insets.top +
                (menu.screen === "level_up"
                  ? landscape
                    ? (size.height < 360 ? 55 : 61) + 36 * (inventoryRows - 1)
                    : 44 + 46 * inventoryRows
                  : landscape
                    ? 10
                    : 20),
              paddingBottom: insets.bottom + (landscape ? 10 : 20),
              paddingLeft: insets.left + 22,
              paddingRight: insets.right + 22,
            },
          ]}
        >
          <ScrollView
            scrollEnabled={!acquisition}
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={[s.panel, landscape && s.panelWide]}>
              {menu.screen !== "menu" && menu.screen !== "level_up" && (
                <Text style={s.eyebrow}>CIRCLE VS GEOMETRY</Text>
              )}
              {options ? (
                landscape ? (
                  <LandscapeOptions
                    volume={runtime.sound.volume}
                    onVolume={(value) => {
                      runtime.sound.setVolume(value);
                      onTick();
                    }}
                    onLanguage={(value) => {
                      setLanguage(value);
                      onTick();
                    }}
                    onBack={() => setOptions(false)}
                  />
                ) : (
                  <>
                    <Text style={s.heading}>{t("Opciones")}</Text>
                    <Text style={s.copy}>{t("Idioma")}</Text>
                    <View style={s.optionRow}>
                      <Button
                        compact={landscape}
                        title="Español"
                        secondary={getLanguage() !== "es"}
                        onPress={() => {
                          setLanguage("es");
                          onTick();
                        }}
                      />
                      <Button
                        compact={landscape}
                        title="English"
                        secondary={getLanguage() !== "en"}
                        onPress={() => {
                          setLanguage("en");
                          onTick();
                        }}
                      />
                    </View>
                    <Text style={s.copy}>
                      {t("Sonido:")} {Math.round(runtime.sound.volume * 100)}%
                    </Text>
                    <View style={s.optionRow}>
                      {[0, 0.3, 0.6, 1].map((volume) => (
                        <Pressable
                          key={volume}
                          accessibilityRole="button"
                          accessibilityLabel={`${Math.round(volume * 100)}%`}
                          onPress={() => {
                            runtime.sound.setVolume(volume);
                            onTick();
                          }}
                          style={[
                            s.volumeStep,
                            runtime.sound.volume === volume && {
                              borderColor: colors.gold,
                            },
                          ]}
                        >
                          <Text style={s.small}>
                            {Math.round(volume * 100)}%
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Button
                      compact={landscape}
                      title={t("Volver")}
                      secondary
                      onPress={() => setOptions(false)}
                    />
                  </>
                )
              ) : menu.screen === "menu" ? (
                landscape ? (
                  <LandscapeHome
                    best={Number(storage.getItem("vs_clone_best_time")) || 0}
                    height={size.height}
                    onStart={() => game.start()}
                    onOptions={() => setOptions(true)}
                    persistent={persistent}
                  />
                ) : (
                  <>
                    <MenuIdentity
                      best={Number(storage.getItem("vs_clone_best_time")) || 0}
                      compact={size.height < 700}
                    />
                    <Button
                      compact={landscape}
                      title={t("Empezar")}
                      testID="start"
                      onPress={() => game.start()}
                    />
                    <Button
                      compact={landscape}
                      title={t("Opciones")}
                      secondary
                      onPress={() => setOptions(true)}
                    />
                    <Text style={s.footnote}>
                      {label(
                        "Arrastra para moverte · Disparo automático",
                        "Drag to move · Automatic fire",
                      )}
                    </Text>
                    {!persistent && (
                      <Text style={s.footnote}>
                        {label(
                          "Guardado no disponible. El récord se conservará en esta sesión.",
                          "Storage unavailable. Records last for this session.",
                        )}
                      </Text>
                    )}
                  </>
                )
              ) : menu.screen === "paused" ? (
                <>
                  <Text style={s.heading}>{t("Pausa")}</Text>
                  <View style={[s.runStack, landscape && s.runWide]}>
                    <View style={landscape ? s.summaryColumn : undefined}>
                      <RunSummary
                        player={player}
                        time={player.survivalTime}
                        kills={player.kills}
                        level={player.level}
                      />
                    </View>
                    <View style={s.runActions}>
                      <Button
                        compact={landscape}
                        title={t("Continuar")}
                        testID="resume"
                        onPress={() => game.togglePause()}
                      />
                      <Button
                        compact={landscape}
                        title={t("Opciones")}
                        secondary
                        onPress={() => setOptions(true)}
                      />
                      <Button
                        compact={landscape}
                        title={t("Reiniciar")}
                        secondary
                        onPress={() => game.start()}
                      />
                      <Button
                        compact={landscape}
                        title={label("Menú principal", "Main menu")}
                        secondary
                        onPress={() => {
                          game.returnToMenu();
                        }}
                      />
                    </View>
                  </View>
                </>
              ) : menu.screen === "level_up" ? (
                <>
                  <LevelUpHeading
                    compact={landscape}
                    level={player.level}
                    pending={game.levelUpSystem.pendingLevelUps}
                  />
                  <View
                    testID="upgrades-grid"
                    style={[s.upgrades, landscape && s.upgradesWide]}
                  >
                    {menu.options?.map((upgrade, i) => (
                      <View
                        key={`${player.level}-${upgradeDestination(upgrade)}-${i}`}
                        style={landscape ? s.upgradeColumn : undefined}
                      >
                        <UpgradeCard
                          compact={landscape}
                          dense={landscape && size.height < 360}
                          key={`${player.level}-${upgradeDestination(upgrade)}-${i}`}
                          player={player}
                          option={upgrade}
                          index={i}
                          selected={acquisition?.key ?? null}
                          locked={!!acquisition}
                          onSelect={chooseUpgrade}
                        />
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={s.heading}>{t("Has caído")}</Text>
                  {menu.stats?.isHighScore && (
                    <Text
                      style={[s.record, landscape && { marginVertical: 0 }]}
                    >
                      {label("¡NUEVO RÉCORD!", "NEW BEST!")}
                    </Text>
                  )}
                  <View style={[s.runStack, landscape && s.runWide]}>
                    <View style={landscape ? s.summaryColumn : undefined}>
                      <RunSummary
                        player={player}
                        time={menu.stats?.time ?? 0}
                        kills={menu.stats?.kills ?? 0}
                        level={menu.stats?.level ?? 1}
                      />
                    </View>
                    <View style={s.runActions}>
                      <Button
                        compact={landscape}
                        title={t("Volver a intentar")}
                        testID="retry"
                        onPress={() => game.start()}
                      />
                      <Button
                        compact={landscape}
                        title={label("Menú principal", "Main menu")}
                        secondary
                        onPress={() => {
                          game.returnToMenu();
                        }}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      )}
      {playing && (
        <EncounterBanner
          game={game}
          top={insets.top + 10}
          width={Math.min(400, safeWidth * (landscape ? 0.58 : 0.92))}
          left={
            insets.left +
            (safeWidth - Math.min(400, safeWidth * (landscape ? 0.58 : 0.92))) /
              2
          }
        />
      )}
      {acquisition && (
        <AcquisitionFlight
          key={acquisition.token}
          acquisition={acquisition}
          slots={slots}
          onComplete={completeAcquisition}
        />
      )}
    </View>
  );
}
export default function GameScreen() {
  return (
    <SafeAreaProvider>
      <MotionProvider>
        <Screen />
      </MotionProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  panelWide: { maxWidth: 1000, paddingVertical: 6, gap: 8 },
  buttonSmall: { minHeight: 43, paddingVertical: 9 },
  runStack: { gap: 12 },
  runWide: { flexDirection: "row", gap: 28, alignItems: "center" },
  summaryColumn: { flex: 1 },
  runActions: { flex: 1, gap: 8 },
  upgrades: { gap: 12 },
  upgradesWide: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  upgradeColumn: { flex: 1, minWidth: 0 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 20,
  },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#080f18ed",
  },
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  panel: { width: "100%", maxWidth: 440, paddingVertical: 16, gap: 12 },
  eyebrow: {
    color: colors.gold,
    letterSpacing: 3,
    fontSize: 11,
    textAlign: "center",
    fontWeight: "700",
  },
  title: {
    color: colors.ink,
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 43,
    letterSpacing: -1.5,
  },
  heading: {
    color: colors.ink,
    fontSize: 31,
    fontWeight: "800",
    textAlign: "center",
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  footnote: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.gold,
    minHeight: 58,
    paddingHorizontal: 36,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  secondary: { backgroundColor: colors.card, borderColor: colors.border },
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
  record: {
    color: colors.gold,
    textAlign: "center",
    fontSize: 12,
    letterSpacing: 2,
    marginVertical: 8,
  },
  heroMark: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  heroCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#e8d9c0",
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroArrow: { fontSize: 40, color: colors.bg },
  triangle: {
    position: "absolute",
    right: "12%",
    top: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 27,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#e35c6e",
    transform: [{ rotate: "25deg" }],
  },
  square: {
    position: "absolute",
    left: "13%",
    bottom: 10,
    width: 23,
    height: 23,
    borderWidth: 3,
    borderColor: colors.blue,
    transform: [{ rotate: "25deg" }],
  },
  hud: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 18,
  },
  hudStats: {
    flex: 1,
    maxWidth: 320,
    padding: 10,
    backgroundColor: "#0b1523d9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#7ec6e030",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  gold: { color: colors.gold, fontSize: 12, fontWeight: "800" },
  timer: {
    color: colors.ink,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    fontSize: 19,
  },
  small: { color: colors.ink, fontSize: 11, lineHeight: 18 },
  bar: {
    height: 9,
    backgroundColor: "#452331",
    borderRadius: 4,
    overflow: "hidden",
  },
  hp: { height: "100%", backgroundColor: "#e35c6e" },
  xp: { height: "100%", backgroundColor: colors.blue },
  pause: {
    backgroundColor: colors.card,
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pauseText: { fontSize: 24, fontWeight: "900", color: colors.ink },
  touchZone: { position: "absolute", width: "55%" },
  joystick: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "#ffffff50",
    backgroundColor: "#ffffff0b",
    alignItems: "center",
    justifyContent: "center",
  },
  knob: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e8d9c080",
    borderWidth: 1,
    borderColor: "#e8d9c0b0",
  },
  actions: {
    position: "absolute",
    flexDirection: "row",
    gap: ACTION_LAYOUT.gap,
    alignItems: "flex-end",
  },
  action: {
    width: ACTION_LAYOUT.dashSize,
    height: ACTION_LAYOUT.dashSize,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.blue,
    backgroundColor: "#14232cf0",
    alignItems: "center",
    justifyContent: "center",
  },
  ultimate: {
    width: ACTION_LAYOUT.ultimateSize,
    height: ACTION_LAYOUT.ultimateSize,
    borderColor: colors.gold,
    backgroundColor: "#30271bf0",
  },
  actionTitle: {
    color: colors.ink,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
  },
  actionSub: { color: colors.ink, fontSize: 10, marginTop: 4 },
  notices: {
    position: "absolute",
    left: 28,
    right: 28,
    alignItems: "center",
    gap: 10,
  },
  hint: {
    color: colors.ink,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    backgroundColor: "#120a10d9",
    padding: 10,
    borderRadius: 8,
  },
  announcement: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    textShadowColor: colors.bg,
    textShadowRadius: 4,
  },
  results: {
    padding: 26,
    backgroundColor: colors.card,
    borderRadius: 16,
    gap: 12,
  },
  resultTime: {
    fontSize: 54,
    fontWeight: "900",
    color: colors.gold,
    textAlign: "center",
  },
  optionRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
  volumeStep: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
});
