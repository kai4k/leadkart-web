import { existsSync, readFileSync } from 'node:fs';
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
