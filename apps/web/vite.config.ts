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
        target: 'http://localhost:3001',
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
});
