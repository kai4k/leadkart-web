import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
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
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 5173,
		strictPort: true
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules/bits-ui/dist/bits/')) {
						if (/\/(combobox|calendar|range-calendar|date-picker|select|pin-input|date-field|date-range-field|time-field|slider|toggle|toggle-group)\//.test(id)) {
							return 'vendor-bits-form';
						}
						if (/\/(command|menubar|navigation-menu|context-menu)\//.test(id)) {
							return 'vendor-bits-data';
						}
					}
				}
			}
		}
	}
});
