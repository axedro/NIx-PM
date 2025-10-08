import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    proxy: {
      // Superset API and UI routes - Production Superset
      '/api/v1': {
        target: 'https://nixpm.dashboard.reddie.ai',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
      '/superset': {
        target: 'https://nixpm.dashboard.reddie.ai',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
      '/logout': {
        target: 'https://nixpm.dashboard.reddie.ai',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
      '/dashboard': {
        target: 'https://nixpm.dashboard.reddie.ai',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
      '/explore': {
        target: 'https://nixpm.dashboard.reddie.ai',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
      '/static': {
        target: 'https://nixpm.dashboard.reddie.ai',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
      // Backend API routes (keep HTTP for local backend)
      '/api/alerts': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/triggers': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/statistics': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/superset-datasets': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
