/// <reference types="vitest" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import type { UserConfig } from 'vite'
import type { InlineConfig } from 'vitest'

interface VitestConfigExport extends UserConfig {
  test: InlineConfig
}

export default defineConfig({
  base: '/chess/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'stockfish.js': path.resolve(__dirname, 'public/stockfish.js'),
      'stockfish.wasm': path.resolve(__dirname, 'public/stockfish.wasm')
    },
  },
  worker: {
    format: 'iife',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
  }
} as VitestConfigExport)

