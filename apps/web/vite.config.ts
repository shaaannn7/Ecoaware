/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Brotli compression for production builds
    compression({ algorithm: 'brotliCompress' }),
    // PWA support (offline & installable)
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Carbon Tracker',
        short_name: 'Carbon',
        description:
          'Track your personal carbon footprint with a premium glass‑morphic UI.',
        theme_color: '#10b981',
        icons: [{ src: '/pwa-icon.png', sizes: '512x512', type: 'image/png' }],
      },
    }),
    // Bundle visualizer for diagnostics
    visualizer({ filename: './dist/bundle-stats.html', open: false }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://ecoaware-api.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Raise warning limit after we split chunks
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          recharts: ['recharts'],
          lucide: ['lucide-react'],
        },
      },
    },
  },
  // ─── Vitest Configuration ──────────────────────────────────────────────────
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
        'src/services/reportGenerator.ts',
        'src/services/api.ts',
      ],
      thresholds: {
        statements: 50,
        branches: 45,
        functions: 50,
        lines: 50,
      },
    },
  },
});
