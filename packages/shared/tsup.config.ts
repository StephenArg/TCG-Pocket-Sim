import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,          // <-- generate .d.ts
  clean: true,
  sourcemap: true,
  target: "es2022",
  outDir: "dist",
});
