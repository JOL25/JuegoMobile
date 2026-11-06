import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL("../node_modules/expo/bin/cli", import.meta.url)),
    "start",
    "--web",
    "--port",
    "8087",
    "--localhost",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, EXPO_PUBLIC_QA: "1" },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
