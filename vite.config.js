import { defineConfig } from 'vite';

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
  }
});
