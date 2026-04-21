import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** For environments where you cannot create dotfiles (e.g. `.env.local`). Not committed — see `.gitignore`. */
function loadSupabaseEnvFile(root: string): Record<string, string> {
  const filePath = path.join(root, 'supabase.env')
  if (!fs.existsSync(filePath)) return {}
  const text = fs.readFileSync(filePath, 'utf8')
  const out: Record<string, string> = {}
  for (let line of text.split('\n')) {
    line = line.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

// https://vite.dev/config/
// Set VITE_BASE when hosting under a subpath (e.g. GitHub Pages project site: VITE_BASE=/Scribbld/)
export default defineConfig(({ mode }) => {
  const root = process.cwd()
  const base = process.env.VITE_BASE ?? '/'
  const fromSupabaseFile = loadSupabaseEnvFile(root)
  const fromViteEnv = loadEnv(mode, root, 'VITE_')
  const viteEnv = { ...fromSupabaseFile, ...fromViteEnv }

  const define: Record<string, string> = {}
  for (const [k, v] of Object.entries(viteEnv)) {
    if (k.startsWith('VITE_')) {
      define[`import.meta.env.${k}`] = JSON.stringify(v)
    }
  }

  return {
    base,
    define,
    plugins: [react(), tailwindcss()],
  }
})
