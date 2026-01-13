import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/flowers-miniapp_v2.0/',
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
