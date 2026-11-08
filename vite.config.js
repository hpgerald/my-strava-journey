import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ask for the three Latin web fonts at the start of the page load, in parallel
// with the script, so the first paint already has them and nothing reflows
// when they land. Only the build has hashed file names, so this runs there.
const PRELOAD = [/^archivo-latin-wdth-normal-.*\.woff2$/, /^inter-latin-wght-normal-.*\.woff2$/, /^inter-tight-latin-wght-normal-.*\.woff2$/]
const preloadFonts = () => ({
  name: 'preload-fonts',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const files = Object.keys(ctx.bundle || {}).filter((f) => PRELOAD.some((re) => re.test(f.split('/').pop())))
      return files.map((f) => ({
        tag: 'link',
        attrs: { rel: 'preload', href: `./${f}`, as: 'font', type: 'font/woff2', crossorigin: '' },
        injectTo: 'head',
      }))
    },
  },
})

// base: './' keeps every asset + data path relative, which is what makes
// GitHub Pages project-site deep-links (via HashRouter) resolve correctly.
export default defineConfig({
  base: './',
  plugins: [react(), preloadFonts()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
})
