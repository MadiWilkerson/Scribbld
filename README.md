# SCRIBBLD

Vite + React + TypeScript. This repo is separate from the Finventory project.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/`). Use in-app navigation, or open routes directly (for example `/home`, `/create`); the dev server supports SPA history routing.

### Supabase (optional shared feed)

Without env vars, drawings and profiles stay on the device (`localStorage`). To sync the feed, likes, and profiles across devices:

1. Create a [Supabase](https://supabase.com) project (free tier is enough).
2. In **Authentication → Providers**, enable **Anonymous** sign-in.
3. In the SQL editor, run `supabase/migrations/001_initial.sql` (tables, RLS, storage bucket `drawing-images`).
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from **Project Settings → Data API / API Keys**): either copy `.env.example` to `.env.local`, or if your environment blocks dotfiles, create **`supabase.env`** in the project root with the same two lines (that file is gitignored and loaded by Vite).
5. On **Vercel** (or your host), add the same two variables to the project environment and redeploy.

To test the production build locally:

```bash
npm run build
npm run preview
```

## Deploy: GitHub → Vercel

GitHub is the source of truth; **Vercel builds and hosts** the site when you push (or open a PR, depending on your Vercel project settings).

1. In [Vercel](https://vercel.com), **Import** this repository from GitHub.
2. Leave the defaults: **Framework Preset** should detect **Vite**, **Build Command** `npm run build`, **Output Directory** `dist`.
3. Deploy. Routes like `/home` and `/create` work on refresh because **`vercel.json`** rewrites unknown paths to `index.html` (see [Vite SPAs on Vercel](https://vercel.com/docs/frameworks/vite#using-vite-to-make-spas)).

For a normal Vercel URL or custom domain at the **root** (`https://your-app.vercel.app/`), you do **not** need `VITE_BASE`. Only set `VITE_BASE` if the app is served from a **subpath** (uncommon on Vercel). Add `VITE_SUPABASE_*` here as well if you use Supabase.

### Other hosts (optional)

- **Netlify:** `public/_redirects` is copied into `dist/` for the same SPA behavior.
- **GitHub Pages only:** `npm run build` also writes `dist/404.html` (copy of `index.html`) for deep links; use `VITE_BASE=/<repo>/` if the site is `https://<user>.github.io/<repo>/`.

UI SVGs live in `public/assets/` (synced from `P3 Assets/SVG Files`). See `src/imports/assets.ts` for paths.
