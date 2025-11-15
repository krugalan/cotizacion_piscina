import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/webhook': {
        target: 'https://devn8nwebhook.zetti.xyz',
        changeOrigin: true,
        rewrite: (path) => {
          // Convertir /api/webhook/cotizacion a /webhook/cotizacion
          const newPath = path.replace(/^\/api\/webhook/, '/webhook')
          console.log('🔄 Proxy rewrite:', path, '->', newPath)
          return newPath
        },
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('❌ Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('📤 Proxy request:', req.method, req.url, '->', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('📥 Proxy response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
})
