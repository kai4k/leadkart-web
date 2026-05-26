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
 */
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 5173,
		strictPort: true
	}
});
