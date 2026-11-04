import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base + hash routing: deploys to any GitHub Pages project URL
// with no per-repo config and no SPA-refresh 404s.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
