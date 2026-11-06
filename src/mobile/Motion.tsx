import React, { createContext, useContext, useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

const ReducedMotion = createContext(false);
export const nativeDriver = Platform.OS !== "web";
export const useReducedMotion = () => useContext(ReducedMotion);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!cancelled) setReduced(value);
    });
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      cancelled = true;
      listener.remove();
    };
  }, []);
  return (
    <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>
  );
}
