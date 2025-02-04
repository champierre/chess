import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import type { UserConfig } from 'vite'
import type { InlineConfig } from 'vitest'
import type { UserConfigExport } from 'vite'
import type { VitestConfigExport } from 'vitest/config'

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
      'Cross-Origin-Embedder-Policy': 'require-corp'
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
      external: []
    },
    assetsInlineLimit: 0
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

