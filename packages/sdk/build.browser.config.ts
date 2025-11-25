import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  // Browser-specific entry point
  entries: ["./src/browser"],

  // Output to separate directory
  outDir: "dist-browser",

  // Target browser environment
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

  // Externals - browser doesn't have Node.js APIs
  externals: [
    "node:os",
    "node:path",
    "node:fs",
    "node:fs/promises",
    "node:crypto",
    "node:buffer",
    "node:stream",
    "node:util",
    "node:zlib",
    "node:child_process",
  ],

  // Fail on warnings to catch issues early
  failOnWarn: false,
});

