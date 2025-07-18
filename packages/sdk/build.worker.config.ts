import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  // Worker-specific entry point
  entries: ["./src/worker"],

  // Output to separate directory
  outDir: "dist-worker",

  // Target browser environment for Workers
  rollup: {
    emitCJS: false, // Workers only support ESM
    esbuild: {
      target: "es2022",
      platform: "browser", // Important for Worker compatibility
      format: "esm",
    },
    dts: {
      respectExternal: false,
    },
  },

  // Clean output directory
  clean: true,

  // Generate declarations
  declaration: true,

  // Externals - let nodejs_compat handle these in the Worker
  externals: [
    // Node built-ins that nodejs_compat provides
    "node:os",
    "node:path",
    "node:fs",
    "node:fs/promises",
    "node:crypto",
    "node:buffer",
    "node:stream",
    "node:util",
    "node:zlib", // Add zlib to externals (use DecompressionStream instead)
    // Never available in Workers
    "node:child_process",
  ],

  // Alias for better compatibility with packages that use Node streams
  alias: {
    // These will be provided by nodejs_compat at runtime
    stream: "node:stream",
    buffer: "node:buffer",
    util: "node:util",
  },

  // Fail on warnings to catch issues early
  failOnWarn: false,
});
