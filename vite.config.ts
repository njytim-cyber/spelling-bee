/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}', 'fonts/*.woff2'],
        globIgnores: ['**/tier*-pipeline*.js', '**/words-tier*.js'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MiB — tier chunks are large
        runtimeCaching: [
          {
            urlPattern: /(words-tier|tier\d+-pipeline).*\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'word-packs', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      manifest: {
        name: 'Spelling Bee',
        short_name: 'Spell Bee',
        description: 'Master spelling with 50,000+ words. Fast, fun, addictive. Challenge your friends!',
        theme_color: '#1a1a24',
        background_color: '#1a1a24',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        id: '/',
        lang: 'en',
        categories: ['education', 'games'],
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 2000, // Word tier chunks are intentionally large
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor: React rarely changes — separate cache lifetime
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
          if (id.includes('firebase/app') || id.includes('firebase/auth') || id.includes('firebase/firestore')) return 'firebase';
          if (id.includes('framer-motion')) return 'framer-motion';
          // Group lazy-loaded word tiers into per-tier chunks
          for (let t = 1; t <= 9; t++) {
            if (id.includes(`/words/tier${t}-pipeline`)) return `tier${t}-pipeline`;
          }
          if (id.includes('/words/tier3')) return 'words-tier3';
          if (id.includes('/words/tier4')) return 'words-tier4';
          if (id.includes('/words/tier5') && !id.includes('tier5-')) return 'words-tier5';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
