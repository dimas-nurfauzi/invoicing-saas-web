/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // BACKEND_URL (no VITE_ prefix) stays server-side: it is not exposed to the browser bundle.
  const backend = loadEnv(mode, process.cwd(), '').BACKEND_URL || 'http://localhost:8080'
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // The browser only talks to the Vite server; /api is forwarded to Spring Boot. The Origin
        // header is dropped so the backend sees a same-origin call: this also works behind a tunnel
        // (ngrok etc.) without adding the tunnel's origin to CORS_ALLOWED_ORIGINS.
        '/api': {
          target: backend,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
