import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8787'

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
      '/api': {
        target: apiProxyTarget,
        // The Worker rejects browser writes whose Origin does not match its
        // own host. Rewriting the dev proxy Origin mirrors production's
        // same-origin request path without weakening the Worker check.
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyRequest) => {
            proxyRequest.setHeader('Origin', new URL(apiProxyTarget).origin)
          })
        },
      },
    },
  },
})
