import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["./src/index", "./src/prompts/index"],
  declaration: true,
  clean: true,
  failOnWarn: false,
  externals: [
    "adm-zip", // Keep as external to avoid bundling
  ],
  rollup: {
    emitCJS: true,
    esbuild: {
      target: "node18",
    },
  },
});
