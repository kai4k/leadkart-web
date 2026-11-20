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
