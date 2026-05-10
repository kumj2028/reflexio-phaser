import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/reflexio-phaser/',
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: false
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,xml,png,jpg,mp3,ogg,wav}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
      },
      manifest: {
        name: 'Reflexio',
        short_name: 'Reflexio',
        description: 'A puzzle platformer with reflection mechanics',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [],
      },
    }),
  ],
});
