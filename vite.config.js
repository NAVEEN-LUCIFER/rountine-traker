import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local-only PWA. No backend. `base: './'` keeps it working on any static host
// (Vercel, Netlify, GitHub Pages subpaths) without extra config.
export default defineConfig({
  base: './',
  plugins: [react()],
})
