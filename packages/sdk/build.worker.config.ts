import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  // Worker-specific entry point
  entries: ["./src/worker"],

  // Output to separate directory
  outDir: "dist-worker",

  // Target browser environment for Workers
  rollup: {
    treeshake: true,
    emitCJS: false,
    esbuild: {
      target: "es2022",
      platform: "browser",
      format: "esm",
    },
    output: {
      inlineDynamicImports: false,
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

  // Fail on warnings to catch issues early
  failOnWarn: false,
});
