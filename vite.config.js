import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 4173,
    allowedHosts: ['all'],
  },
  server: {
    proxy: {
      '/dataforseo': {
        target: 'https://api.dataforseo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dataforseo/, ''),
      },
      '/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openai/, ''),
      },
    },
  },
})
