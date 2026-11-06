import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

// Web is a QA preview of the same native scene; mobile imports App.tsx directly.
export default function App() {
  const [Screen, setScreen] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    LoadSkiaWeb({ locateFile: () => "/canvaskit.wasm" })
      .then(() => {
        if (!cancelled)
          setScreen(() => require("./src/mobile/GameScreen").default);
      })
      .catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);
  if (Screen) return <Screen />;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#120a10",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {error ? (
        <Text style={{ color: "#fff" }}>{error}</Text>
      ) : (
        <ActivityIndicator color="#e8b13a" />
      )}
    </View>
  );
}
