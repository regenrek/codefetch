import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    './src/browser'
  ],
  outDir: 'dist-browser',
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false, // Browser doesn't need CJS
    output: {
      // Inline all code to avoid shared chunks
      inlineDynamicImports: true,
      manualChunks: undefined,
    },
    esbuild: {
      target: 'es2020',
      platform: 'browser'
    }
  },
  // Don't create shared chunks
  failOnWarn: false,
})