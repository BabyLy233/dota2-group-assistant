import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'apps/web/src')

export default defineConfig({
  resolve: {
    alias: {
      '@': webSrc,
    },
  },
  test: {
    include: ['apps/*/src/**/*.test.{ts,tsx}', 'packages/*/src/**/*.test.{ts,tsx}'],
    environment: 'node',
    pool: 'forks',
  },
})
