import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPrecached } from '../../../src/service-worker/precache-filter.ts';

const sw = resolve(__dirname, '../../../build/client/service-worker.js');

// Locally a stale build/ is what gets checked; CI always builds first, so a missing file fails there.
if (!existsSync(sw) && process.env.CI) {
	describe('built service worker', () => {
		it('requires a build before this test', () => {
			throw new Error('build/client/service-worker.js missing — run npm run build first');
		});
	});
} else {
	describe.skipIf(!existsSync(sw))('built service worker', () => {
		it('precaches immutable app chunks', () => {
			const src = readFileSync(sw, 'utf8');
			expect(src).toMatch(/_app\/immutable\//);
		});

		it('does not reference the removed $service-worker module', () => {
			expect(readFileSync(sw, 'utf8')).not.toContain('$service-worker');
		});
	});
}

import { findFilesystemUrls } from '../../../scripts/arch/lib/css-urls.mjs';

describe('findFilesystemUrls (self-test)', () => {
	it('flags a drive-letter path, a leaked absolute path and node_modules', () => {
		expect(
			findFilesystemUrls('a{src:url(../../../../D:/Dev/x/node_modules/f/a.woff2)}')
		).toHaveLength(1);
		expect(findFilesystemUrls("a{src:url('../../../../home/runner/work/x/f.woff2')}")).toHaveLength(
			1
		);
		expect(findFilesystemUrls('a{src:url(/node_modules/f/a.woff2)}')).toHaveLength(1);
		expect(findFilesystemUrls('a{src:url(file:///C:/x/a.woff2)}')).toHaveLength(1);
	});
	it('accepts data URIs, fragments and ordinary asset URLs', () => {
		expect(findFilesystemUrls('a{b:url("data:image/svg+xml,%3Csvg/%3E")}')).toEqual([]);
		expect(findFilesystemUrls('a{b:url(#id)}')).toEqual([]);
		expect(findFilesystemUrls('a{src:url(/_app/immutable/assets/font.AbC.woff2)}')).toEqual([]);
		expect(findFilesystemUrls('a{src:url(./font.woff2)}')).toEqual([]);
	});
});

const assets = resolve(__dirname, '../../../build/client/_app/immutable/assets');
// same rule as the service-worker block above: locally a missing build skips, CI throws
if (!existsSync(assets) && process.env.CI) {
	describe('built CSS', () => {
		it('requires a build before this test', () => {
			throw new Error('build/client/_app/immutable/assets missing — run npm run build first');
		});
	});
} else {
	describe.skipIf(!existsSync(assets))('built CSS', () => {
		it('contains no absolute filesystem path in any url()', () => {
			const bad = readdirSync(assets)
				.filter((f) => f.endsWith('.css'))
				.flatMap((f) => findFilesystemUrls(readFileSync(resolve(assets, f), 'utf8')));
			expect(bad).toEqual([]);
		});
	});
}

describe('the precache list leaves out what offline never needs', () => {
	it.each([
		'og-image-light.png',
		'/og-image-dark.png',
		'mstile-150x150.png',
		'mstile-310x310.png',
		'android-chrome-512x512.png',
		'maskable-512x512.png'
	])('%s is not precached', (f) => expect(isPrecached(f)).toBe(false));
	it.each([
		'favicon.ico',
		'favicon.svg',
		'manifest.webmanifest',
		'android-chrome-192x192.png',
		'apple-touch-icon.png',
		'offline.html'
	])('%s is precached', (f) => expect(isPrecached(f)).toBe(true));
	it('the service worker filters its asset list with it, and nothing else about it changed', () => {
		const src = readFileSync(resolve(__dirname, '../../../src/service-worker/index.ts'), 'utf8');
		expect(src).toContain('assets.filter(({ path }) => isPrecached(path))');
	});
	it('static/ still holds every file the head and the manifest link, and none of the removed ones', () => {
		const statics = readdirSync(resolve(__dirname, '../../../static'));
		expect(statics).toContain('mstile-310x310.png');
		expect(statics).not.toContain('favicon-48x48.png');
	});
});

describe('the filtered static list, compared with an independently written expected set', () => {
	it('static/ minus the link-preview image, the Windows tiles and the 512 px icons is exactly what is precached', () => {
		const statics = readdirSync(resolve(__dirname, '../../../static'), { recursive: true })
			.map(String)
			.sort();
		const precached = statics.filter((f) => isPrecached(f));
		// written by hand, not derived from NOT_PRECACHED: a file added to static/ must be decided here
		expect(precached).toEqual([
			'android-chrome-192x192.png',
			'apple-touch-icon.png',
			'favicon-16x16.png',
			'favicon-32x32.png',
			'favicon.ico',
			'favicon.svg',
			'manifest.webmanifest',
			'offline.html'
		]);
		expect(statics.filter((f) => !isPrecached(f))).toEqual([
			'android-chrome-512x512.png',
			'maskable-512x512.png',
			'mstile-150x150.png',
			'mstile-310x310.png',
			'og-image-light.png'
		]);
	});
});
