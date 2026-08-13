import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const dsh = (relative) => fileURLToPath(new URL(`../dsh/${relative}`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      // The published /client bundles are browser module-loader format and
      // crash under Node; tests resolve the same entries to their sources.
      '@deepseek-ai/dsh-client-runtime/client': dsh('packages/client/runtime/src/client/index.ts'),
      '@deepseek-ai/dsh-client-connection/client': dsh('packages/client/connection/src/client/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      exclude: [
        // Pure type declarations: no runtime code exists to cover.
        'src/types.ts',
        'src/contract.ts',
      ],
    },
  },
})
