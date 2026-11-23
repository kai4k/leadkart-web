import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import FilterBar, {
	filterAccept,
	type FilterBarField
} from '#lib/components/data/FilterBar.svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';

type Filters = Record<string, string | string[] | undefined>;

function fakeFilters(initial: Filters = {}) {
	const state = reactiveProps<{ filters: Filters }>({ filters: initial });
	const calls = {
		setFilter: vi.fn((key: string, value: string | string[] | undefined) => {
			state.filters = { ...state.filters, [key]: value };
		}),
		setMany: vi.fn((patch: Filters) => {
			state.filters = { ...state.filters, ...patch };
		}),
		clearAll: vi.fn(() => {
			state.filters = {};
		})
	};
	return {
		urlFilters: {
			get filters() {
				return state.filters;
			},
			schema: {},
			activeChips: [],
			hasActive: false,
			clearFilter: vi.fn(),
			clearValue: vi.fn(),
			...calls
		},
		calls
	};
}

const FIELDS: FilterBarField[] = [
	{
		key: 'stage',
		label: 'Stage',
		type: 'multi-select',
		options: [
			{ value: 'new', label: 'New' },
			{ value: 'interested', label: 'Interested' }
		]
	},
	{
		key: 'kind',
		label: 'Kind',
		type: 'select',
		options: [
			{ value: 'a', label: 'Alpha' },
			{ value: 'b', label: 'Beta' }
		]
	},
	{ key: 'placed', label: 'Placed', type: 'date-range' },
	{ key: 'mine', label: 'Mine only', type: 'boolean' },
	{ key: 'q', label: 'Text', type: 'text' }
];

// jsdom has no scrollIntoView; bits Command scrolls the highlighted item into view.
if (typeof Element.prototype.scrollIntoView !== 'function') {
	Element.prototype.scrollIntoView = vi.fn();
}

const segments = () => [
	...document.body.querySelectorAll<HTMLInputElement>(
		'[data-segment]:not([data-segment="literal"])'
	)
];

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

function render(urlFilters: unknown, open = true) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(FilterBar as never, { target, props: { fields: FIELDS, urlFilters, open } });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

const button = (name: string) =>
	[...document.body.querySelectorAll<HTMLElement>('button')].find((b) =>
		b.textContent?.replace(/\s+/g, ' ').trim().startsWith(name)
	);

async function openStage() {
	const trigger = target.querySelector<HTMLElement>('#filterbar-stage')!;
	trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	await tick();
	flushSync();
	await new Promise((r) => setTimeout(r, 0));
	flushSync();
}
const options = () => [...document.body.querySelectorAll<HTMLElement>('[role="option"]')];

describe('FilterBar', () => {
	it('starts collapsed behind a Show filters button when not open', () => {
		render(fakeFilters().urlFilters, false);
		expect(button('Show filters')).toBeDefined();
		expect(target.querySelector('#filterbar-stage')).toBeNull();
		button('Show filters')!.click();
		flushSync();
		expect(target.querySelector('#filterbar-stage')).not.toBeNull();
	});

	it('the multi-select trigger is a button named after the field, saying "Any" with nothing chosen', () => {
		render(fakeFilters().urlFilters);
		const trigger = target.querySelector<HTMLElement>('#filterbar-stage')!;
		expect(trigger.tagName).toBe('BUTTON');
		expect(trigger.textContent?.trim()).toBe('Any');
		const name = document.getElementById('filterbar-stage-label')!.textContent;
		expect(name).toBe('Stage');
	});

	it('picking options toggles them and keeps the list open for the next one', async () => {
		const { urlFilters, calls } = fakeFilters();
		render(urlFilters);
		await openStage();
		expect(options().map((o) => o.textContent?.trim())).toEqual(['New', 'Interested']);
		options()[1]!.click();
		await tick();
		expect(calls.setFilter).toHaveBeenLastCalledWith('stage', ['interested']);
		flushSync();
		expect(options()).toHaveLength(2);
		options()[0]!.click();
		await tick();
		expect(calls.setFilter).toHaveBeenLastCalledWith('stage', ['interested', 'new']);
	});

	it('an option already chosen is toggled off', async () => {
		const { urlFilters, calls } = fakeFilters({ stage: ['new', 'interested'] });
		render(urlFilters);
		expect(target.querySelector('#filterbar-stage')!.textContent).toContain('2 selected');
		await openStage();
		options()[0]!.click();
		await tick();
		expect(calls.setFilter).toHaveBeenLastCalledWith('stage', ['interested']);
	});

	it('a select field writes its value', () => {
		const { urlFilters, calls } = fakeFilters();
		render(urlFilters);
		const select = target.querySelector<HTMLSelectElement>('select')!;
		select.value = 'b';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		expect(calls.setFilter).toHaveBeenCalledWith('kind', 'b');
	});

	it('a boolean field writes "true" when ticked and clears when unticked', () => {
		const { urlFilters, calls } = fakeFilters();
		render(urlFilters);
		const box = target.querySelector<HTMLElement>('#filterbar-mine')!;
		box.click();
		flushSync();
		expect(calls.setFilter).toHaveBeenLastCalledWith('mine', 'true');
		box.click();
		flushSync();
		expect(calls.setFilter).toHaveBeenLastCalledWith('mine', '');
	});

	it('the date range is the DateRangePicker (typed segments), not a native date input', () => {
		render(fakeFilters().urlFilters);
		expect(target.querySelector('input[type="date"]')).toBeNull();
		expect(segments()).toHaveLength(6);
	});

	it('a range already in the URL fills the picker segments', () => {
		render(fakeFilters({ placed_from: '2026-03-05', placed_to: '2026-04-09' }).urlFilters);
		expect(segments().map((s) => s.value)).toEqual(['05', '03', '2026', '09', '04', '2026']);
	});

	it('a range change is ONE write of both keys, never two navigations', () => {
		const { urlFilters, calls } = fakeFilters({
			placed_from: '2026-03-05',
			placed_to: '2026-04-09'
		});
		render(urlFilters);
		// step the start day up by one: the range changes, and both keys travel together
		const first = segments()[0]!;
		first.focus();
		first.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })
		);
		flushSync();
		expect(calls.setMany).toHaveBeenCalledTimes(1);
		expect(calls.setMany).toHaveBeenCalledWith({
			placed_from: '2026-03-06',
			placed_to: '2026-04-09'
		});
		expect(calls.setFilter).not.toHaveBeenCalled();
	});

	it.each(['notadate', '2026-13-45', '2026-02-30', '20260101'])(
		'a URL date that is no date (%s) is dropped: the bar renders and the picker side is empty',
		(bad) => {
			render(fakeFilters({ placed_from: bad, placed_to: '2026-04-09' }).urlFilters);
			expect(segments().map((s) => s.value)).toEqual(['', '', '', '09', '04', '2026']);
			expect(target.querySelector('#filterbar-stage')).not.toBeNull();
		}
	);

	it('a value that is no option is not a choice: the trigger says "Any", and the next pick drops it', async () => {
		const { urlFilters, calls } = fakeFilters({ stage: ['bogus'] });
		render(urlFilters);
		expect(target.querySelector<HTMLElement>('#filterbar-stage')!.textContent?.trim()).toBe('Any');
		await openStage();
		options()
			.find((o) => o.textContent?.includes('Interested'))!
			.click();
		flushSync();
		expect(calls.setFilter).toHaveBeenLastCalledWith('stage', ['interested']);
	});

	it('aria-selected says which options are CHOSEN, not which one is highlighted', async () => {
		render(fakeFilters({ stage: ['interested'] }).urlFilters);
		await openStage();
		const list = document.body.querySelector('[role="listbox"]')!;
		expect(list.getAttribute('aria-multiselectable')).toBe('true');
		const opt = (name: string) => options().find((o) => o.textContent?.includes(name))!;
		// "New" is highlighted (the first item) and NOT chosen; "Interested" is chosen and not highlighted
		expect(opt('New').hasAttribute('data-selected')).toBe(true);
		expect(opt('New').getAttribute('aria-selected')).toBe('false');
		expect(opt('Interested').hasAttribute('data-selected')).toBe(false);
		expect(opt('Interested').getAttribute('aria-selected')).toBe('true');
		// no second, spoken "Selected" beside the state
		expect(opt('Interested').textContent?.trim()).toBe('Interested');
		opt('New').click();
		flushSync();
		expect(opt('New').getAttribute('aria-selected')).toBe('true');
	});

	it('Reset filters clears everything', () => {
		const { urlFilters, calls } = fakeFilters({ kind: 'a' });
		render(urlFilters);
		button('Reset filters')!.click();
		expect(calls.clearAll).toHaveBeenCalledTimes(1);
	});

	it('Hide filters closes the bar', () => {
		render(fakeFilters().urlFilters);
		button('Hide filters')!.click();
		flushSync();
		expect(target.querySelector('#filterbar-stage')).toBeNull();
		expect(button('Show filters')).toBeDefined();
	});
});

describe('filterAccept: what the URL may hold for a set of fields', () => {
	const accept = filterAccept(FIELDS);

	it('a select or multi-select accepts its options only', () => {
		expect(accept.stage!('new')).toBe(true);
		expect(accept.stage!('bogus')).toBe(false);
		expect(accept.kind!('b')).toBe(true);
		expect(accept.kind!('')).toBe(false);
	});

	it('a date range accepts real calendar dates on both keys', () => {
		expect(accept.placed_from!('2026-01-31')).toBe(true);
		expect(accept.placed_to!('2026-01-31')).toBe(true);
		for (const bad of ['notadate', '2026-13-45', '2026-02-30', '20260101', ''])
			expect(accept.placed_from!(bad), bad).toBe(false);
	});

	it('a boolean accepts "true"; a text field accepts anything (no rule)', () => {
		expect(accept.mine!('true')).toBe(true);
		expect(accept.mine!('yes')).toBe(false);
		expect(accept.q).toBeUndefined();
	});
});
