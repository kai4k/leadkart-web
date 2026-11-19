import { describe, expect, it, vi } from 'vitest';

const goto = vi.hoisted(() => vi.fn());
const pageState = vi.hoisted(() => ({ url: new URL('http://x/leads') }));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({ page: pageState }));

import { createUrlFilters } from '#lib/hooks/use-url-filters.svelte.ts';
import { createSavedViews } from '#lib/hooks/use-saved-views.svelte.ts';

interface F {
	[k: string]: string | string[] | undefined;
	stage: string | undefined;
	tag: string[];
}
function setup(search: string) {
	pageState.url = new URL(`http://x/leads${search}`);
	const filters = createUrlFilters<F>({
		stage: { type: 'string', label: 'Stage' },
		tag: { type: 'string[]', label: 'Tag' }
	});
	const views = createSavedViews<F>(
		[
			{ id: 'all', label: 'All', filters: {} },
			{ id: 'won', label: 'Won', filters: { stage: 'won' } }
		],
		filters
	);
	return views;
}

describe('createSavedViews', () => {
	it('"All" is active only when no schema filter is set', () => {
		expect(setup('').isActive('all')).toBe(true);
		expect(setup('?stage=won').isActive('all')).toBe(false);
		expect(setup('?tag=x').isActive('all')).toBe(false);
		expect(setup('?view=table').isActive('all')).toBe(true);
	});
	it('a preset view is not active while other schema keys are set', () => {
		expect(setup('?stage=won').isActive('won')).toBe(true);
		expect(setup('?stage=won&tag=x').isActive('won')).toBe(false);
	});
	it('activeId picks the first view that matches', () => {
		expect(setup('?stage=won').activeId).toBe('won');
		expect(setup('').activeId).toBe('all');
		expect(setup('?stage=lost').activeId).toBeNull();
	});
	it('activate navigates once, clearing the other filters', () => {
		goto.mockClear();
		setup('?stage=lost&tag=x&view=table').activate('won');
		expect(goto).toHaveBeenCalledTimes(1);
		expect(goto).toHaveBeenCalledWith('/leads?view=table&stage=won', {
			reset: false,
			replace: true
		});
	});
});
