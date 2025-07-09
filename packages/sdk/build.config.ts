import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    './src/index',
    './src/browser'
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      target: 'node18'
    }
  }
})