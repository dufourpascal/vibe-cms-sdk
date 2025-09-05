import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2020',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  bundle: true,
  outDir: 'dist',
  external: [],
  noExternal: [/.*/],
  platform: 'browser',
  env: {
    NODE_ENV: 'production'
  }
})