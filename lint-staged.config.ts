import { defineConfig } from 'lint-staged'

export default defineConfig({
  '*.{ts,tsx,js,mjs,json,md}': ['oxfmt'],
  '*.{ts,tsx}': ['oxlint --fix-dry-run'],
})
