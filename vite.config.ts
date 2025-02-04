import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
/// <reference types="vitest" />
import type { UserConfig } from 'vite'
import type { InlineConfig } from 'vitest'

interface VitestConfigExport extends UserConfig {
  test: InlineConfig
}

export default defineConfig({
  base: '/chess/',
  plugins: [
    react({
      jsxRuntime: 'classic',
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    })
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    },
    host: true,
    strictPort: true,
    fs: {
      strict: false,
      allow: ['..']
    }
  },
  publicDir: 'public',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        assetFileNames: 'assets/[name][extname]'
      }
    },
    assetsInlineLimit: 0,
    target: 'esnext'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    deps: {
      optimizer: {
        web: {
          include: ['**/*']
        }
      }
    }
  }
} as VitestConfigExport)

