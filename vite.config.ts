import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Vite dev-server config.
 *
 * NO `/api/*` proxy. The BFF route handler at
 * `src/routes/api/[...path]/+server.ts` is the canonical proxy in BOTH
 * dev and prod — it reads the httpOnly access cookie, injects Bearer +
 * X-Tenant-Id headers, and forwards to GO_API_URL.
 *
 * A Vite dev-server proxy on `/api/*` would BYPASS the SvelteKit route
 * (Vite proxies short-circuit the SvelteKit handler chain), shipping
 * browser requests directly to Go without the Bearer header → 401 on
 * every authenticated route. That bug landed once already; don't add
 * the proxy back. See `src/routes/api/[...path]/+server.ts` for the
 * full proxy chain.
 *
 * Chunking is left to Kit 3's `output.codeSplitting` (a custom `manualChunks`
 * is ignored by rolldown there). Bundle size is informational (desktop-first).
 */
export default defineConfig({
	plugins: [
		tailwindcss(),
		// SvelteKit config — adapter-node for BFF deployment.
		//
		// SvelteKit's Node server is the auth-context owner: httpOnly cookies
		// live at the SvelteKit <-> browser boundary; SvelteKit talks server-to-
		// server to the Go API with Bearer tokens. Browser never sees a token.
		//
		// Per docs.svelte.dev/docs/kit/adapter-node: `out` is the directory for
		// the compiled Node server. `precompress` brotli + gzip so the static
		// asset handler serves pre-compressed files directly without per-request
		// compression.
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter({ out: 'build', precompress: true }),
			alias: {
				$features: 'src/lib/features',
				$layouts: 'src/lib/layouts',
				$ui: 'src/lib/components/ui',
				$form: 'src/lib/components/form',
				$icons: 'src/lib/icons',
				$api: 'src/lib/api'
			}
		})
	],
	resolve: {
		alias: [
			// TODO: remove once Tailwind resolves tw-animate-css upstream.
			// tw-animate-css exports its stylesheet under the `style` condition
			// only. Kit 3's SSR build could not resolve the bare app.css
			// `@import` (Tailwind's resolver conditions are ignored for the ssr
			// environment), so point the exact bare specifier at the file.
			{
				find: /^tw-animate-css$/,
				replacement: fileURLToPath(
					new URL('./node_modules/tw-animate-css/dist/tw-animate.css', import.meta.url)
				)
			}
		]
	},
	server: { port: 5173, strictPort: true }
});
