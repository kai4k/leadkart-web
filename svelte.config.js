import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * SvelteKit config — adapter-node for BFF deployment.
 *
 * SvelteKit's Node server is the auth-context owner: httpOnly cookies
 * live at the SvelteKit ↔ browser boundary; SvelteKit talks server-to-
 * server to the Go API with Bearer tokens. Browser never sees a token.
 *
 * Per docs.svelte.dev/docs/kit/adapter-node: `out` is the directory for
 * the compiled Node server. `precompress` brotli + gzip so the static
 * asset handler serves pre-compressed files directly without per-request
 * compression.
 *
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ out: 'build', precompress: true }),
		alias: {
			$features: 'src/lib/features',
			$layouts: 'src/lib/layouts',
			$ui: 'src/lib/components/ui',
			$form: 'src/lib/components/form',
			$icons: 'src/lib/icons',
			$api: 'src/lib/api'
		}
	}
};

export default config;
