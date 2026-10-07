import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// BASE_PATH serves the app under a path prefix (e.g. /vector/ behind the shared hub nginx).
// API_PROXY_TARGET points the dev server's /api proxy at the backend (8191 when it runs in Docker).
const base = process.env.BASE_PATH || '/'

export default defineConfig({
    base,
    plugins: [react(), tailwindcss()],
    server: {
        port: 5173,
        proxy: {
            [`${base}api`]: {
                target: process.env.API_PROXY_TARGET || 'http://localhost:8000',
                changeOrigin: true,
                rewrite: (path) => path.slice(`${base}api`.length) || '/'
            }
        }
    }
})
