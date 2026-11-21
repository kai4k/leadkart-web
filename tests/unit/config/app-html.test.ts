import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Hovering a link must not run the route's server load: the section guard is a capabilities call to
 * Go (and the tenant settings load a tenant fetch) per hovered link. Data preloads on tap only; the
 * JavaScript of a route may still preload on hover (no Go call).
 */
describe('app.html preloading', () => {
	const body = /<body([^>]*)>/.exec(readFileSync('src/app.html', 'utf8'))?.[1] ?? '';
	it('preloads data on tap, not on hover', () => {
		expect(body).toContain('data-sveltekit-preload-data="tap"');
		expect(body).not.toContain('data-sveltekit-preload-data="hover"');
	});
	it('keeps code preloading on hover', () => {
		expect(body).toContain('data-sveltekit-preload-code="hover"');
	});
});

describe('app.html preferences shell', () => {
	const html = readFileSync('src/app.html', 'utf8');
	it('takes the preference attributes from the server', () => {
		expect(html).toContain('%lk.html.attrs%');
	});
	it('has no inline script, no localStorage and no forced colour scheme', () => {
		expect(html).not.toContain('<script');
		expect(html).not.toContain('localStorage');
		expect(html).not.toContain('name="color-scheme"');
	});
});

/**
 * Link previews. The (auth) routes are client-rendered (ssr = false), so a crawler that fetches /signin gets this
 * shell and nothing from a <svelte:head>: the tags live HERE, with the public origin from PUBLIC_SITE_URL
 * (SvelteKit fills %sveltekit.env.PUBLIC_*% from the runtime environment; unset gives an empty string, so the URL
 * degrades to root-relative in development).
 */
describe('app.html link preview', () => {
	const html = readFileSync('src/app.html', 'utf8');
	const ORIGIN = '%sveltekit.env.PUBLIC_SITE_URL%';
	it('writes og:url, og:image (+ size), twitter:card and twitter:image from the public site URL', () => {
		expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/" />`);
		expect(html).toContain(`<meta property="og:image" content="${ORIGIN}/og-image-light.png" />`);
		expect(html).toContain('<meta property="og:image:width" content="1200" />');
		expect(html).toContain('<meta property="og:image:height" content="630" />');
		expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
		expect(html).toContain(`<meta name="twitter:image" content="${ORIGIN}/og-image-light.png" />`);
	});
	it('has exactly one of each image tag, and the root layout no longer writes a duplicate', () => {
		expect(html.match(/property="og:image"/g)).toHaveLength(1);
		expect(html.match(/name="twitter:image"/g)).toHaveLength(1);
		const layout = readFileSync('src/routes/+layout.svelte', 'utf8');
		expect(layout).not.toMatch(/og:|twitter:/);
		expect(layout).not.toContain('<svelte:head>');
	});
	it('PUBLIC_SITE_URL is declared as a public, runtime env var (Kit 3 fills the placeholder only from src/env.ts)', () => {
		expect(readFileSync('src/env.ts', 'utf8')).toMatch(/PUBLIC_SITE_URL:\s*\{\s*public: true/);
	});
	it('the variable is documented as mandatory in production (README and .env.example)', () => {
		expect(readFileSync('README.md', 'utf8')).toMatch(/`PUBLIC_SITE_URL`[^\n]*production/i);
		expect(readFileSync('.env.example', 'utf8')).toMatch(/PUBLIC_SITE_URL=/);
	});
});
