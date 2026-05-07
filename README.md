# leadkart-web

LeadKart SaaS web frontend — Svelte 5 + SvelteKit 2 + Tailwind 4 SPA targeting the [`leadkart-go`](https://github.com/kai4k/leadkart-go) JSON API.

## Stack

| Concern    | Choice                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------- |
| Framework  | SvelteKit 2 (adapter-static for SPA, no SSR)                                              |
| Components | Svelte 5 (runes — `$state`, `$props`, `$derived`)                                         |
| Styling    | Tailwind 4 (`@tailwindcss/vite` plugin, CSS-first `@theme`)                               |
| Build      | Vite 6                                                                                    |
| TypeScript | 5+                                                                                        |
| Icons      | lucide-svelte                                                                             |
| i18n       | svelte-i18n (en + hi seed)                                                                |
| Testing    | Vitest (unit) + Playwright (e2e) + @testing-library/svelte                                |
| Linting    | eslint v9 flat config + prettier 3 + prettier-plugin-svelte + prettier-plugin-tailwindcss |

## Project layout (industry-canonical, feature-first)

```
src/
├─ lib/
│  ├─ api/             # cross-cutting fetch wrapper + typed errors
│  ├─ components/      # primitives (no business knowledge): ui/, form/, feedback/, data/
│  ├─ features/        # vertical slices, one per business feature: auth/, tenant/, leads/...
│  ├─ layouts/         # AppShell, Topbar, Sidebar, Footer, AuthShell
│  ├─ stores/          # global runes — theme, toast queue
│  ├─ icons/           # lucide-svelte re-exports + custom SVGs
│  ├─ i18n/            # svelte-i18n setup + locales/{en,hi}.json
│  ├─ utils/           # cn, format, validation
│  ├─ types/           # cross-feature types
│  └─ server/          # server-only files (none today — pure SPA)
├─ routes/
│  ├─ (auth)/          # signin, signup, forgot, reset, verify
│  └─ (app)/           # dashboard + signed-in shell, auth-guarded
├─ params/
├─ hooks.client.ts
├─ app.html
├─ app.css             # Tailwind base + design tokens (oklch)
└─ app.d.ts
```

Sources for the layout: SvelteKit "Project Structure" docs, Geoff Rich blog, shadcn-svelte canon, Tom Camp "Production SvelteKit", Brittney Postma / Rich Harris talks at Svelte Summit 2024.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173 — proxies /api/* to localhost:8080
npm run check        # svelte-check + tsc
npm run lint         # prettier --check + eslint
npm run test         # vitest
npm run test:e2e     # playwright (requires `npm run build` first)
```

## API integration

Dev: vite proxies `/api/*` → `http://localhost:8080` (the leadkart-go API). No CORS. Production: set `PUBLIC_API_BASE_URL` at build time to the deployed leadkart-go URL.

Auth: bearer JWT in `Authorization` header. Token persisted to `localStorage` keyed `leadkart-session`. Refresh handled by `lib/features/auth/api.ts` (TODO: silent-refresh interceptor on 401).

## Deployment

`adapter-static` produces a pure static bundle. Deploy targets:

- Cloudflare Pages
- Vercel (static)
- S3 + CloudFront
- Netlify

Build:

```bash
npm run build   # → ./build/
```

## License

UNLICENSED — proprietary, LeadKart team.
