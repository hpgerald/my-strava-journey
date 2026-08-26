import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps every asset + data path relative, which is what makes
// GitHub Pages project-site deep-links (via HashRouter) resolve correctly.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
})
