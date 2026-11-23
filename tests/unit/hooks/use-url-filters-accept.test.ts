import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: {
		url: new URL(
			'http://x/orders?status=bogus&status=paid&status=void&placed_from=notadate&placed_to=2026-01-31&kind=zzz&q=free+text'
		)
	}
}));

import { createUrlFilters } from '#lib/hooks/use-url-filters.svelte.ts';

interface F {
	[k: string]: string | string[] | undefined;
	status: string[];
	placed_from: string | undefined;
	placed_to: string | undefined;
	kind: string | undefined;
	q: string | undefined;
}
const schema = {
	status: { type: 'string[]', label: 'Status' },
	placed_from: { type: 'string', label: 'From' },
	placed_to: { type: 'string', label: 'To' },
	kind: { type: 'string', label: 'Kind', defaultValue: 'a' },
	q: { type: 'string', label: 'Search' }
} as const;

describe('createUrlFilters: accept', () => {
	const filters = createUrlFilters<F>(schema, {
		accept: {
			status: (v) => ['paid', 'draft'].includes(v),
			placed_from: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
			placed_to: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
			kind: (v) => ['a', 'b'].includes(v)
		}
	});

	it('a refused value is read as absent: it cannot be sent to the API', () => {
		expect(filters.filters.status).toEqual(['paid']);
		expect(filters.filters.placed_from).toBeUndefined();
		expect(filters.filters.placed_to).toBe('2026-01-31');
	});

	it('a refused scalar falls back to the default of its field', () => {
		expect(filters.filters.kind).toBe('a');
	});

	it('a key without a rule accepts anything', () => {
		expect(filters.filters.q).toBe('free text');
	});

	it('a refused value is no chip', () => {
		expect(filters.activeChips.map((c) => `${c.key}=${c.value}`)).toEqual([
			'status=paid',
			'placed_to=2026-01-31',
			'kind=a',
			'q=free text'
		]);
	});

	it('without accept every value is read as before', () => {
		const open = createUrlFilters<F>(schema);
		expect(open.filters.status).toEqual(['bogus', 'paid', 'void']);
		expect(open.filters.placed_from).toBe('notadate');
		expect(open.filters.kind).toBe('zzz');
	});
});
