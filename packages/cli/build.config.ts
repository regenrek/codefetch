import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [{ input: "./src/index" }, { input: "./src/cli", format: "esm" }],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      target: "node18",
    },
  },
  failOnWarn: false,
});
