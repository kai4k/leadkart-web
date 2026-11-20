# leadkart-web

LeadKart SaaS web frontend — Svelte 5 + SvelteKit + Tailwind 4, served by an adapter-node BFF in front of the [`leadkart-go`](https://github.com/kai4k/leadkart-go) JSON API.

## Stack

| Concern    | Choice                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------- |
| Framework  | SvelteKit (adapter-node BFF: SSR first paint, client-side routing after)                  |
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
│  └─ server/          # server-only BFF code: config, cookies, Go calls, guards
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
npm run dev          # http://localhost:5173 — the BFF calls Go at GO_API_URL (.env.local)
npm run check        # svelte-check + tsc
npm run lint         # prettier --check + eslint
npm run test         # vitest
npm run test:e2e     # playwright (requires `npm run build` first)
npm run preview:e2e  # the built server with the e2e-only env (NODE_ENV=test; never for deploys)
```

## API integration

The browser talks only to the SvelteKit server (BFF), never to Go. Browser calls go to `/api/*`, which `src/routes/api/[...path]/+server.ts` forwards to `GO_API_URL` with the Bearer token read from the httpOnly access cookie, the operator scope as `X-Tenant-Id`, the CSRF check and one silent refresh on an expired token. Server loads and form actions call Go the same way through `#lib/server/go.ts`. There is no Vite `/api` proxy, in dev either.

Auth state lives only in httpOnly cookies set by the BFF; the browser never sees a token. Full contract: `docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md`.

## Deployment

`npm run build` produces an adapter-node server in `./build/`; run it with `node build/index.js`. The build needs no runtime environment. The environment below is validated once when the server starts (the `init` hook): a missing or invalid value stops the process with a message naming the key.

| Variable                          | Required                                | Purpose                                                                                                                                                                                                                            |
| --------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GO_API_URL`                      | yes                                     | Internal URL of the Go API (server-to-server; Go is never internet-facing).                                                                                                                                                        |
| `SCOPE_COOKIE_SECRET`             | yes                                     | HMAC key (32+ chars) signing `lk_op_tenant`. Generate with `openssl rand -base64 48`. Production rejects the published e2e (`e2e-only…`) and dev secrets.                                                                          |
| `NODE_ENV`                        | no (unset = `production`)               | `production` gives `Secure` cookies and the `__Host-` access cookie (HTTPS only). Fails closed.                                                                                                                                    |
| `ORIGIN`                          | production: this **or** the two headers | Public https origin (no path), e.g. `https://app.example.com`. Without it or the headers below, SvelteKit's origin check rejects every form action, sign-in included, behind a TLS proxy.                                          |
| `PROTOCOL_HEADER` + `HOST_HEADER` | production: both, **or** `ORIGIN`       | e.g. `x-forwarded-proto` / `x-forwarded-host`. **Only when a trusted reverse proxy overwrites these headers on every request**; otherwise clients can spoof them and forge the origin.                                             |
| `ADDRESS_HEADER` / `XFF_DEPTH`    | production behind a proxy               | `ADDRESS_HEADER=x-forwarded-for` and `XFF_DEPTH=<number of proxies in front of the BFF>`; leave both unset when nothing sits in front. The BFF sends the resulting client address to Go as `X-Forwarded-For` (see Client address). |
| `PORT`                            | no (default 3000)                       | Listen port.                                                                                                                                                                                                                       |
| `BODY_SIZE_LIMIT`                 | no (default 512K)                       | Maximum request body size, e.g. for CSV uploads.                                                                                                                                                                                   |
| `UPSTREAM_TIMEOUT_MS`             | no (default 10000)                      | Time-to-first-byte timeout for every BFF to Go request (504 on expiry).                                                                                                                                                            |

`PORT`, `BODY_SIZE_LIMIT`, `ADDRESS_HEADER` and `XFF_DEPTH` are read by adapter-node itself. `.env.example` lists the same keys. `npm run preview:e2e` runs the build with the published e2e secret and `NODE_ENV=test`; it is for the test suite only.

### Client address

Go rate-limits login, refresh and password reset per client address (30 per minute per address on login). It takes that address from `X-Forwarded-For` **only when the direct peer is a trusted proxy**, so the BFF sends one on every call to Go (the proxy, server loads and form actions, the silent refresh): `event.getClientAddress()`, exactly one IP, never a header the browser sent. When the address cannot be read or is not a single IP the header is omitted (Go falls back to the BFF's own address) and a warning is logged once.

- Web: `ADDRESS_HEADER=x-forwarded-for` and `XFF_DEPTH=<number of proxies in front of the BFF>` (unset when nothing sits in front: the socket address is then used).
- Go: list the BFF's address in `LEADKART_HTTP__TRUSTED_PROXIES`, or Go ignores the header and every user shares the BFF's bucket.
- A wrong `XFF_DEPTH` (too small) makes the address client-spoofable (a caller can pick the value the BFF reads); too large and the BFF errors or reads the wrong hop.

### Cookies

All set by the BFF with `SameSite=Strict` and `Path=/`, and `Secure` in production:

| Cookie                                              | httpOnly | Holds                                                                                  |
| --------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `__Host-lk_access` (prod) / `lk_access` (dev, test) | yes      | Access JWT.                                                                            |
| `lk_refresh`                                        | yes      | Refresh token.                                                                         |
| `lk_csrf`                                           | no       | CSRF token, echoed as `X-CSRF-Token` on mutating requests (double-submit).             |
| `lk_op_tenant`                                      | yes      | Signed operator scope (the tenant a platform operator is acting on). Never in the URL. |
| `lk_mcp`                                            | yes      | "Must change password" marker (page redirects only).                                   |

### Reverse proxy headers

The `handle` hook adds the security headers, but SvelteKit answers some requests before `handle` runs (the trailing-slash 308, an unknown `/_app/*` 404, the static error page), and adapter-node serves the build assets (`/_app/immutable/*`) and the files in `static/` (served at the site root) before `handle` as well. None of those get the hook's headers, so the reverse proxy should add `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` globally.

## License

UNLICENSED — proprietary, LeadKart team.
