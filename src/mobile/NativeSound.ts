import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { storage } from "../game/storage.js";
import { AUDIO } from "../game/config.js";
import { soundAssets } from "./soundAssets";

export class NativeSound {
  volume = Math.max(
    0,
    Math.min(1, Number(storage.getItem("vs_clone_volume") ?? 0.6) || 0),
  );
  suspended = false;
  private players = new Map<string, AudioPlayer>();
  private lastPlayed = new Map<string, number>();
  private initialized = false;
  private disposed = false;
  private generation = 0;
  private seeking = new Set<string>();
  async init() {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "mixWithOthers",
      });
      if (this.disposed) return;
      for (const [key, effect] of Object.entries(soundAssets)) {
        const player = createAudioPlayer(effect.source);
        player.volume = this.volume * AUDIO.volume;
        this.players.set(key, player);
      }
      this.initialized = true;
    } catch {
      /* Audio is optional; gameplay stays available. */
    }
  }
  unlock() {}
  play(name: string) {
    if (!this.initialized || this.suspended || this.volume === 0) return false;
    const effect = soundAssets[name];
    const player = this.players.get(name);
    const now = Date.now() / 1000;
    if (
      !effect ||
      !player ||
      !player.isLoaded ||
      player.playing ||
      this.seeking.has(name) ||
      now - (this.lastPlayed.get(name) ?? -Infinity) < effect.cooldown
    )
      return false;
    if (
      [...this.players.values()].filter((p) => p.playing).length >=
      AUDIO.maxVoices
    )
      return false;
    this.lastPlayed.set(name, now);
    const generation = this.generation;
    this.seeking.add(name);
    player
      .seekTo(0)
      .then(() => {
        if (
          generation === this.generation &&
          !this.suspended &&
          !this.disposed &&
          this.volume > 0
        )
          player.play();
      })
      .catch(() => {})
      .finally(() => this.seeking.delete(name));
    return true;
  }
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    for (const player of this.players.values())
      player.volume = this.volume * AUDIO.volume;
    storage.setItem("vs_clone_volume", String(this.volume));
    if (!this.volume) this.stopAll();
  }
  setSuspended(value: boolean) {
    this.suspended = value;
    if (value) this.stopAll();
  }
  stopAll() {
    this.generation++;
    for (const player of this.players.values()) player.pause();
    this.lastPlayed.clear();
  }
  dispose() {
    this.disposed = true;
    this.stopAll();
    for (const p of this.players.values()) p.remove();
    this.players.clear();
  }
}
