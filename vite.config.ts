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
 * Manual chunk splitting (FAANG canon — Vercel/Linear/Stripe):
 *   - `vendor-bits-form`: form-input compounds (Combobox / Calendar /
 *     RangeCalendar / DatePicker / Select / PinInput) — only loaded on
 *     form routes; signin + dashboard never pull these.
 *   - `vendor-bits-data`: heavy data-surface compounds (Command /
 *     Menubar / NavigationMenu / ContextMenu) — load on detail pages.
 *   - default vendor: bits-ui core (Dialog / Tooltip / Dropdown /
 *     Popover / Tabs / Accordion / Drawer / Sheet) used by AppShell on
 *     every authenticated route — keep in the shared chunk.
 *
 * Why split: the previous single-chunk bits-ui payload pulled every
 * compound on first paint even though only Dialog/Tooltip/Dropdown were
 * needed for the AppShell. Splitting form + data compounds into deferred
 * chunks moves ~40-50 KB gz out of the initial paint.
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
		alias: {
			// tw-animate-css exports its stylesheet under the `style` condition
			// only. Kit 3's SSR build resolves app.css `@import`s without that
			// condition (Tailwind's createResolver conditions are ignored for
			// the ssr environment), so point the bare import at the file.
			'tw-animate-css': fileURLToPath(
				new URL('./node_modules/tw-animate-css/dist/tw-animate.css', import.meta.url)
			)
		}
	},
	server: { port: 5173, strictPort: true },
	// Client-only: the serviceWorker environment (Kit 3) is built with
	// `codeSplitting: false`, which rejects `output.manualChunks`.
	environments: {
		client: {
			build: {
				rollupOptions: {
					output: {
						manualChunks(id) {
							// bits-ui core (Dialog/Drawer/Dropdown/Tooltip) stays in the
							// default shared chunk — AppShell + UserMenu need them every
							// authenticated route. EVERYTHING else gets deferred.
							if (id.includes('node_modules/bits-ui/dist/bits/')) {
								// Form-input compounds — only loaded on form routes.
								if (
									/\/(combobox|calendar|range-calendar|date-picker|select|pin-input|date-field|date-range-field|time-field|slider|toggle|toggle-group|switch|checkbox|radio-group)\//.test(
										id
									)
								) {
									return 'vendor-bits-form';
								}
								// Heavy data-surface compounds — only on detail / feature pages.
								if (
									/\/(command|menubar|navigation-menu|context-menu|accordion|tabs|hover-card|sheet|alert-dialog|scroll-area|aspect-ratio|collapsible|popover|label|separator)\//.test(
										id
									)
								) {
									return 'vendor-bits-data';
								}
							}
							// Zod is heavy (~26 KB gz) and only needed where gateway
							// parseResponse runs — defer to its own chunk so initial paint
							// pulls it only when a route actually fetches.
							if (id.includes('node_modules/zod/')) {
								return 'vendor-zod';
							}
							// formsnap + sveltekit-superforms — form stack, only used on
							// form routes (auth, settings/account, settings/tenant).
							if (
								id.includes('node_modules/formsnap/') ||
								id.includes('node_modules/sveltekit-superforms/')
							) {
								return 'vendor-forms';
							}
							// TanStack Query — used everywhere authenticated but is its own
							// concern. Splitting it lets browsers cache it independently of
							// app code that changes more often.
							if (id.includes('node_modules/@tanstack/svelte-query/')) {
								return 'vendor-tanstack';
							}
						}
					}
				}
			}
		}
	}
});
