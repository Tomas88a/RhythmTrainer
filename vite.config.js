import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA 离线缓存配置
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Rhythm Master',
        short_name: 'Rhythm',
        description: 'Tactical Rhythm Trainer',
        theme_color: '#111111',
        background_color: '#111111',
        display: 'standalone', // 这一行让它在手机上没有地址栏，全屏运行
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // 缓存所有资源，断网也能用
      }
    })
  ],
  // 关键修改：Cloudflare 网页部署必须用 '/'，如果是做APK才改回 './'
  base: '/', 
})
