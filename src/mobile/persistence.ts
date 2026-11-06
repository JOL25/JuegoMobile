import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from "../game/storage.js";

const KEY = "@JuegoMobile/v1";
let pending: Promise<void> = Promise.resolve();

export async function hydrateStorage(): Promise<{ persistent: boolean }> {
  const cache = new Map<string, string>();
  let persistent = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (data && typeof data === "object" && !Array.isArray(data)) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") cache.set(key, value);
      }
    }
  } catch {
    persistent = false;
  }
  storage.useBackend({
    getItem: (key: string) => cache.get(key) ?? null,
    setItem(key: string, value: string) {
      cache.set(key, String(value));
      const snapshot = JSON.stringify(Object.fromEntries(cache));
      // Serialize writes so an older async write cannot overwrite a newer score.
      pending = pending
        .then(() => AsyncStorage.setItem(KEY, snapshot))
        .catch(() => {});
    },
  });
  return { persistent };
}

export function flushStorage() {
  return pending;
}
