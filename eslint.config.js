import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
export default defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/**",
      "dist-native/**",
      "node_modules/**",
      "public/**",
      "android/**",
      "ios/**",
      "src/game/**",
      "tests/**",
      "scripts/WebSoundSynthesizer.js",
    ],
  },
  { rules: { "@typescript-eslint/no-explicit-any": "off" } },
]);
