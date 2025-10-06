import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Superset API and UI routes
      '/api/v1': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
      },
      '/superset': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
      },
      '/login': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
      },
      '/logout': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
      },
      '/dashboard': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
      },
      '/explore': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
      },
      // Backend API routes
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
