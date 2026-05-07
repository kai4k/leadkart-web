import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * SvelteKit config — adapter-static for SPA deployment to CDN
 * (Cloudflare Pages / Vercel static / S3+CloudFront). Auth-gated app
 * with no SSR needs; SPA mode keeps the leadkart-go backend stateless +
 * the frontend cacheable at the edge.
 *
 * Per docs.svelte.dev/docs/kit/single-page-apps: adapter-static with
 * `fallback: "index.html"` produces an SPA bundle. Routes resolve
 * client-side; SvelteKit prerendering is opt-in per page.
 *
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: 'index.html',
			pages: 'build',
			assets: 'build',
			strict: true
		}),
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
