import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Canvas,
  Picture,
  Skia,
  SkiaPictureView,
  type SkPicture,
} from "@shopify/react-native-skia";
import { Platform, StyleSheet, type ViewProps } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SkiaContext } from "../rendering/SkiaContext";
import { FrameMonitor, FramePacer } from "./performance.js";

type Props = {
  game: any;
  width: number;
  height: number;
  onTick: () => void;
  onError: (message: string) => void;
};
type Publish = (picture: SkPicture) => void;

function useGameLoop(
  { game, width, height, onTick, onError }: Props,
  publish: Publish,
  surface: string,
) {
  useEffect(() => {
    if (!width || !height) return;
    game.resize(width, height);
    game.clock.reset();
    const recorder = Skia.PictureRecorder();
    const bounds = Skia.XYWHRect(0, 0, width, height);
    const pacer = new FramePacer(60);
    const monitor = new FrameMonitor(240);
    let context: SkiaContext | null = null;
    let frame = 0;
    let lastHud = 0;
    let cancelled = false;
    let lastState: string | null = null;
    const tick = (time: number) => {
      if (cancelled) return;
      try {
        if (game.pageHidden) {
          pacer.reset();
        } else {
          const changed = game.state !== lastState;
          const playing = game.state === "playing";
          if (changed && playing) {
            monitor.reset();
            pacer.reset();
          }
          const paced = playing && pacer.shouldDraw(time);
          if (changed || paced) {
            const start = performance.now();
            const canvas = recorder.beginRecording(bounds);
            canvas.scale(
              width / game.canvas.width,
              height / game.canvas.height,
            );
            if (context) context.reset(canvas);
            else context = new SkiaContext(canvas);
            game.ctx = context;
            game.frame(time);
            const next = recorder.finishRecordingAsPicture();
            publish(next);
            if (playing) monitor.record(time, performance.now() - start);
            lastState = game.state;
            if (changed || time - lastHud >= 100) {
              game.renderMetrics = monitor.snapshot(surface);
              onTick();
              lastHud = time;
            }
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
      context?.dispose();
      recorder.dispose();
      bounds.dispose();
    };
  }, [game, width, height, onTick, onError, publish, surface]);
}

// Shared Picture props are supported by Skia v2.14 + Reanimated 4. The native
// renderer observes replacement directly, without reconciling React every frame.
const NativeSurface = memo(function NativeSurface(props: Props) {
  const empty = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    recorder.beginRecording();
    const picture = recorder.finishRecordingAsPicture();
    recorder.dispose();
    return picture;
  }, []);
  const picture = useSharedValue(empty);
  const publish = useCallback(
    (next: SkPicture) => picture.set(next),
    [picture],
  );
  useGameLoop(props, publish, "native-shared-picture");
  return (
    <Canvas opaque style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  );
});

// SkiaPictureView's web ref exposes setPicture/redraw (verified against the
// installed public web implementation). This bypasses the scene reconciler.
// Replacing the handle's current picture before disposing the old one prevents
// a queued microtask from trying to replay an already-deleted CanvasKit object.
interface WebPictureHandle {
  setPicture(picture: SkPicture): void;
  redraw(): void;
}
const WebPictureView = SkiaPictureView as unknown as React.ComponentType<
  ViewProps & { ref: React.Ref<WebPictureHandle>; opaque?: boolean }
>;
const WebSurface = memo(function WebSurface(props: Props) {
  const view = useRef<WebPictureHandle>(null);
  const current = useRef<SkPicture | null>(null);
  const publish = useCallback((next: SkPicture) => {
    if (!view.current) {
      next.dispose();
      return;
    }
    const previous = current.current;
    view.current.setPicture(next);
    current.current = next;
    previous?.dispose();
  }, []);
  useGameLoop(props, publish, "web-imperative-picture");
  useEffect(
    () => () => {
      current.current?.dispose();
      current.current = null;
    },
    [],
  );
  return (
    <WebPictureView
      ref={view}
      opaque
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
});

export const GameCanvas = Platform.OS === "web" ? WebSurface : NativeSurface;
