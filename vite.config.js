import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_LARAVEL_API || ''
  const origin = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase

  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    server: origin
      ? {
          proxy: {
            // Route attachments through the dev server to avoid CORS (5173 -> 8000).
            '/storage': { target: origin, changeOrigin: true, secure: false },
            '/uploads': { target: origin, changeOrigin: true, secure: false },
            // Helpful for Sanctum cookie bootstrap in dev.
            '/sanctum': { target: origin, changeOrigin: true, secure: false },
            // Optional: allow /api passthrough if you ever switch api.baseURL to /api.
            '/api': { target: origin, changeOrigin: true, secure: false },
          },
        }
      : undefined,
  }
})
