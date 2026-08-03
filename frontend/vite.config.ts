import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3333",
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"]
  }
})
