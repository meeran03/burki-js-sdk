import { defineConfig } from "tsup";
import type { Plugin } from "esbuild";

// Server and browser entries must share the error constructor used by the
// admission cleanup logic. Keep it as one physical module per output format.
const sharedSessionError: Plugin = {
  name: "shared-session-error",
  setup(build) {
    build.onResolve({ filter: /^\.\/(?:browser\/)?session-error$/ }, (args) => {
      const extension = build.initialOptions.format === "esm" ? "mjs" : "js";
      const relative = args.path.startsWith("./browser/") ? "./browser/" : "./";
      return { path: `${relative}session-error.${extension}`, external: true };
    });
  },
};

export default defineConfig({
  entry: { index: "src/index.ts", "browser/index": "src/browser/index.ts", "browser/session-error": "src/browser/session-error.ts" },
  format: ["cjs", "esm"],
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: ["livekit-client"],
  esbuildPlugins: [sharedSessionError],
});
