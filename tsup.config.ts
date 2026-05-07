import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  bundle: true,
  clean: true,
  loader: {
    '.md': 'text',
    '.plugin': 'text',
  },
})
