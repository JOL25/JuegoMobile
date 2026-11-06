import React, { useEffect, useState } from "react";
import {
  Canvas,
  Picture,
  Skia,
  type SkPicture,
} from "@shopify/react-native-skia";
import { Platform, StyleSheet } from "react-native";
import { SkiaContext } from "../rendering/SkiaContext";

export function GameCanvas({
  game,
  width,
  height,
  onTick,
  onError,
}: {
  game: any;
  width: number;
  height: number;
  onTick: () => void;
  onError: (message: string) => void;
}) {
  const [picture, setPicture] = useState<SkPicture | null>(null);
  useEffect(
    () => () => {
      // CanvasKit uses manual WASM ownership. Dispose after the replacement commits.
      // Native JSI objects are retained and reclaimed by the native renderer/runtime.
      if (Platform.OS === "web") picture?.dispose();
    },
    [picture],
  );
  useEffect(() => {
    if (!width || !height) return;
    game.resize(width, height);
    let frame = 0;
    let lastHud = 0;
    let cancelled = false;
    let lastState: string | null = null;
    const tick = (time: number) => {
      if (cancelled) return;
      try {
        // Backgrounded apps do not simulate or allocate native drawing resources.
        if (
          !game.pageHidden &&
          (game.state === "playing" || game.state !== lastState)
        ) {
          const recorder = Skia.PictureRecorder();
          const canvas = recorder.beginRecording(
            Skia.XYWHRect(0, 0, width, height),
          );
          canvas.scale(width / game.canvas.width, height / game.canvas.height);
          const context = new SkiaContext(canvas);
          game.ctx = context;
          try {
            game.frame(time);
          } finally {
            context.dispose();
          }
          const next = recorder.finishRecordingAsPicture();
          recorder.dispose();
          setPicture(next);
          lastState = game.state;
          if (time - lastHud >= 100) {
            onTick();
            lastHud = time;
          }
        }
        frame = requestAnimationFrame(tick);
      } catch (error) {
        game.suspend();
        onError(error instanceof Error ? error.message : String(error));
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      game.input.reset();
    };
  }, [game, width, height, onTick, onError]);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {picture && <Picture picture={picture} />}
    </Canvas>
  );
}
