import { defineConfig } from 'vitest/config';

// Logic + route-handler tests run in a Node environment (no DOM/React this pass).
// Vite resolves the `@/*` alias natively from tsconfig.json via resolve.tsconfigPaths.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/app/api/**'],
    },
  },
});
