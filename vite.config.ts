import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Repo name is "AltoTech" (case-sensitive on GitHub Pages) -> base must match exactly.
const BASE = '/AltoTech/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
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
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
