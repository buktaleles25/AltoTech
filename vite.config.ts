import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Repo name is "AltoTech" (case-sensitive on GitHub Pages) -> base must match exactly.
const BASE = '/AltoTech/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  // transformers.js โหลดแบบ dynamic ใน worker — ไม่ต้อง pre-bundle
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  worker: { format: 'es' },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'ลายน้ำน่ารัก — ใส่ลายน้ำหลายรูปพร้อมกัน',
        short_name: 'ลายน้ำน่ารัก',
        description:
          'ใส่ลายน้ำรูปภาพทีละหลายรูปในคลิกเดียว ทำงานบนเครื่อง 100% เซฟลงมือถือง่าย 🎀',
        lang: 'th',
        theme_color: '#d98a9c',
        background_color: '#fbf9f5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{css,html,svg,png,woff,woff2}'],
        // ไม่ precache JS ก้อนใหญ่ (transformers.js) — ให้ runtime-cache แทน
        globIgnores: ['**/transformers*.js', '**/ort*.js', '**/*.wasm'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // โมเดล AI + onnxruntime จาก CDN → cache ไว้ใช้ offline
            urlPattern: ({ url }) =>
              url.hostname.includes('huggingface.co') ||
              url.hostname.includes('hf.co') ||
              url.hostname.includes('cdn-lfs') ||
              url.hostname.includes('jsdelivr.net'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ai-models',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            // app JS (รวม transformers chunk) → StaleWhileRevalidate
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith('.js'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'app-js' },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
