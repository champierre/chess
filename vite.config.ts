import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, UserConfig } from "vite"

export default defineConfig({
  base: '/chess/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts']
  }
})

