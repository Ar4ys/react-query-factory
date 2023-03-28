import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    includeSource: ['src/**/*.{ts,tsx}', '!src/vitest.tsx'],
    typecheck: {
      include: ['src/**/*.{ts,tsx}'],
    },
    setupFiles: './src/vitest.tsx',
    restoreMocks: true,
  },
});
