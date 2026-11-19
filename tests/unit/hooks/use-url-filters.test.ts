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
