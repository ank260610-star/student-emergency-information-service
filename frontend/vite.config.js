import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Explicit syntax floor for supported embedded browsers; runtime APIs use feature detection.
  build: {
    target: ['chrome87', 'edge88', 'firefox78', 'safari14'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': process.env.API_PROXY_TARGET || 'http://127.0.0.1:8787',
    },
  },
})
