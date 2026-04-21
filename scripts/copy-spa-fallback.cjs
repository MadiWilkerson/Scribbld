/**
 * GitHub Pages serves 404.html for unknown paths. Duplicating index.html lets
 * deep links like /home load the SPA shell so client routing can run.
 */
const fs = require('node:fs')
const path = require('node:path')

const dist = path.join(__dirname, '..', 'dist')
const index = path.join(dist, 'index.html')
const fallback = path.join(dist, '404.html')

if (!fs.existsSync(index)) {
  console.error('copy-spa-fallback: dist/index.html missing (run vite build first)')
  process.exit(1)
}

fs.copyFileSync(index, fallback)
console.log('copy-spa-fallback: wrote dist/404.html')
