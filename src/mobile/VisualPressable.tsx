import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { nativeDriver, useReducedMotion } from "./Motion";

const Target = Animated.createAnimatedComponent(Pressable);
type Props = Omit<PressableProps, "style" | "children"> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
  ready?: boolean;
  round?: boolean;
};

export function VisualPressable({
  children,
  style,
  accent = "#e8b13a",
  ready = false,
  round = false,
  onPressIn,
  onPressOut,
  onTouchStart,
  onTouchEnd,
  ...props
}: Props) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [wave] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (props.disabled) {
      scale.stopAnimation();
      scale.setValue(1);
    }
  }, [props.disabled, scale]);
  useEffect(() => {
    if (!ready || reduced || props.disabled) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1050,
          easing: Easing.out(Easing.quad),
          useNativeDriver: nativeDriver,
          isInteraction: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 850,
          useNativeDriver: nativeDriver,
          isInteraction: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ready, reduced, props.disabled, pulse]);
  useEffect(
    () => () => {
      scale.stopAnimation();
      wave.stopAnimation();
    },
    [scale, wave],
  );
  const down = () => {
    if (props.disabled || reduced) return;
    scale.stopAnimation();
    Animated.spring(scale, {
      toValue: 0.91,
      speed: 40,
      bounciness: 0,
      useNativeDriver: nativeDriver,
    }).start();
    wave.stopAnimation();
    wave.setValue(0);
    Animated.timing(wave, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
      isInteraction: false,
    }).start();
  };
  const up = () => {
    Animated.spring(scale, {
      toValue: 1,
      speed: 20,
      bounciness: reduced ? 0 : 15,
      useNativeDriver: nativeDriver,
    }).start();
  };
  return (
    <Target
      {...props}
      accessibilityState={{
        ...props.accessibilityState,
        disabled: !!props.disabled,
      }}
      onPressIn={(event) => {
        down();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        up();
        onPressOut?.(event);
      }}
      onTouchStart={(event) => {
        down();
        onTouchStart?.(event);
      }}
      onTouchEnd={(event) => {
        up();
        onTouchEnd?.(event);
      }}
      onTouchCancel={(event) => {
        up();
        props.onTouchCancel?.(event);
      }}
      style={[
        s.base,
        round && s.round,
        { borderColor: accent },
        style,
        { transform: [{ scale }] },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          s.halo,
          {
            borderColor: accent,
            borderRadius: round ? 60 : 15,
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.08, 0.65],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.12],
                }),
              },
            ],
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[s.shine, { backgroundColor: accent }]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: round ? 60 : 13, overflow: "hidden" },
        ]}
      >
        <Animated.View
          style={[
            s.wave,
            {
              backgroundColor: accent,
              opacity: wave.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0, 0.24, 0],
              }),
              transform: [
                {
                  scale: wave.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.1, 2.2],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
      {children}
    </Target>
  );
}
const s = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderBottomWidth: 4,
    borderRadius: 14,
    backgroundColor: "#19202c",
    overflow: "visible",
  },
  round: { borderRadius: 60, borderBottomWidth: 3 },
  halo: {
    position: "absolute",
    left: -4,
    right: -4,
    top: -4,
    bottom: -4,
    borderWidth: 1,
  },
  shine: {
    position: "absolute",
    left: "24%",
    right: "24%",
    top: 1,
    height: 2,
    opacity: 0.42,
  },
  wave: {
    position: "absolute",
    width: 64,
    height: 64,
    left: "50%",
    top: "50%",
    marginLeft: -32,
    marginTop: -32,
    borderRadius: 32,
  },
});
