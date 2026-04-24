import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: [
      'src/**/__tests__/**/*.test.{js,jsx}',
      'src/**/tests/**/*.test.{js,jsx}',
    ],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/**/__tests__/**', 'src/test/**'],
    },
  },
});
