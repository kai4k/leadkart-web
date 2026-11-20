import { describe, expect, it } from 'vitest';
import { findRawApiFetches, isAllowed } from '../../../scripts/arch/check-no-raw-api-fetch.mjs';

/** Self-test of the arch gate: fixtures, not the repository. */
describe('check-no-raw-api-fetch', () => {
	it('flags a direct fetch to an /api path', () => {
		expect(findRawApiFetches(`const r = await fetch('/api/v1/x', { method: 'POST' });`)).toEqual([
			1
		]);
		expect(findRawApiFetches('x;\nawait fetch(`/api${path}`);')).toEqual([2]);
		expect(findRawApiFetches(`await window.fetch("/api/operator/scope");`)).toEqual([1]);
		expect(findRawApiFetches(`await globalThis.fetch('/api/v1/x');`)).toEqual([1]);
	});

	it('flags the indirection: a constant holding the path, fetched elsewhere in the file', () => {
		const src = `const SCOPE_PATH = '/api/operator/scope';\nawait fetch(SCOPE_PATH, { method: 'POST' });`;
		expect(findRawApiFetches(src)).toEqual([2]);
	});

	it('does not flag a fetch to a non-/api path, or an /api literal with no fetch', () => {
		expect(findRawApiFetches(`await fetch('/auth/logout', { method: 'POST' });`)).toEqual([]);
		expect(findRawApiFetches(`const href = '/api/docs';`)).toEqual([]);
	});

	it('comments never count', () => {
		expect(findRawApiFetches(`// await fetch('/api/v1/x')\n/* fetch('/api/y') */`)).toEqual([]);
	});

	it('a method named fetch (event.fetch, refetch) is not the global fetch', () => {
		expect(
			findRawApiFetches(`const a = '/api/x';\nawait event.fetch(a);\nquery.refetch();`)
		).toEqual([]);
	});

	it('only the client, the BFF handlers and server code are exempt', () => {
		expect(isAllowed('src/lib/api/client.ts')).toBe(true);
		expect(isAllowed('src/routes/api/[...path]/+server.ts')).toBe(true);
		expect(isAllowed('src/lib/server/go.ts')).toBe(true);
		expect(isAllowed('src/lib/features/leads/api.ts')).toBe(false);
		expect(isAllowed('src/lib/api/operator-scope.ts')).toBe(false);
		expect(isAllowed('src/service-worker/index.ts')).toBe(true); // pinned: it names /api only to skip it
		expect(isAllowed('src/service-worker/other.ts')).toBe(false);
	});
});
