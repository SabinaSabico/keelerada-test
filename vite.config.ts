import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/keelerada-test/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Avoid browser CORS when calling Ekilex during local `npm run dev`.
      '/api/ekilex': {
        target: 'https://ekilex.ee',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/ekilex/, '/api'),
      },
    },
  },
})
