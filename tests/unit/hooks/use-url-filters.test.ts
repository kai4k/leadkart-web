import { describe, expect, it, vi } from 'vitest';

const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({
	page: { url: new URL('http://x/leads?stage=new&name=ab&view=table') }
}));

import { createUrlFilters } from '#lib/hooks/use-url-filters.svelte.ts';

interface F {
	[k: string]: string | undefined;
	stage: string | undefined;
	name: string | undefined;
	temperature: string | undefined;
}

describe('createUrlFilters.setMany', () => {
	it('clears schema keys, applies the patch, keeps foreign params, navigates once', () => {
		const filters = createUrlFilters<F>({
			stage: { type: 'string', label: 'Stage' },
			name: { type: 'string', label: 'Name' },
			temperature: { type: 'string', label: 'Temperature' }
		});
		filters.setMany({ temperature: 'hot' }, { clearOthers: true });
		expect(goto).toHaveBeenCalledTimes(1);
		expect(goto).toHaveBeenCalledWith('/leads?view=table&temperature=hot', {
			reset: false,
			replace: true
		});
	});
});

describe('createUrlFilters.setMany edge cases', () => {
	interface T {
		[k: string]: string | string[] | undefined;
		stage: string | undefined;
		tag: string[];
	}
	const make = () =>
		createUrlFilters<T>({
			stage: { type: 'string', label: 'Stage' },
			tag: { type: 'string[]', label: 'Tag' }
		});

	it('writes array fields as repeated keys and replaces previous values', () => {
		goto.mockClear();
		make().setMany({ tag: ['a', 'b'] });
		expect(goto).toHaveBeenCalledTimes(1);
		expect(goto).toHaveBeenCalledWith('/leads?stage=new&name=ab&view=table&tag=a&tag=b', {
			reset: false,
			replace: true
		});
	});

	it('clearOthers: false keeps existing schema params', () => {
		goto.mockClear();
		make().setMany({ tag: ['x'] }, { clearOthers: false });
		expect(goto.mock.calls[0]![0]).toBe('/leads?stage=new&name=ab&view=table&tag=x');
	});

	it('skips keys that are not in the schema (dev warning) instead of throwing', () => {
		goto.mockClear();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(() =>
			make().setMany({ stage: 'won', bogus: 'x' } as never, { clearOthers: true })
		).not.toThrow();
		expect(goto.mock.calls[0]![0]).toBe('/leads?name=ab&view=table&stage=won');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('bogus'));
		warn.mockRestore();
	});
});
