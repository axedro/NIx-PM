import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
      },
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
      }
    }
  }
})
