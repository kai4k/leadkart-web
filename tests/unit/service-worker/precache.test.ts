import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

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
describe.skipIf(!existsSync(assets))('built CSS', () => {
	it('contains no absolute filesystem path in any url()', () => {
		const bad = readdirSync(assets)
			.filter((f) => f.endsWith('.css'))
			.flatMap((f) => findFilesystemUrls(readFileSync(resolve(assets, f), 'utf8')));
		expect(bad).toEqual([]);
	});
});
