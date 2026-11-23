import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';

type Hit = {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	created_at: string;
};
type Result = { persons: Hit[]; has_partial: boolean };

// The search query is replaced by a fixed answer: this file is about what the page SAYS for it.
const h = vi.hoisted(() => {
	const state = {
		result: undefined as unknown,
		refetch: undefined as unknown as () => unknown
	};
	const queries = () => ({
		PERSON_SEARCH_MIN: 2,
		personsSearchQuery: (getQuery: () => string) => ({
			get data() {
				return getQuery().length >= 2 ? state.result : undefined;
			},
			isPending: false,
			isError: false,
			error: null,
			refetch: () => state.refetch()
		})
	});
	return { state, queries };
});
vi.mock('#lib/features/operator/people/queries.ts', h.queries);
vi.mock('#lib/features/operator/people/queries', h.queries);

import PeopleList from '#lib/features/operator/people/components/PeopleList.svelte';

const ALICE: Hit = {
	id: '11111111-1111-4111-8111-111111111111',
	email: 'alice@acme.test',
	first_name: 'Alice',
	last_name: 'Anderson',
	created_at: '2026-01-01T00:00:00Z'
};

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
afterEach(() => {
	vi.useRealTimers();
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

function search(q: string, result: Result) {
	vi.useFakeTimers();
	h.state.result = result;
	h.state.refetch = vi.fn();
	target = document.body.appendChild(document.createElement('div'));
	component = mount(PeopleList, { target });
	flushSync();
	const box = target.querySelector<HTMLInputElement>('input[type="search"]')!;
	box.value = q;
	box.dispatchEvent(new Event('input', { bubbles: true }));
	vi.advanceTimersByTime(1000);
	flushSync();
}
const text = () => target.textContent?.replace(/\s+/g, ' ') ?? '';
const button = (name: string) =>
	[...target.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.textContent?.trim() === name
	);

describe('PeopleList: what an empty answer means', () => {
	it('nothing typed: asks for a search, claims nothing', () => {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(PeopleList, { target });
		flushSync();
		expect(text()).toContain('Search for a person');
	});

	it('a search that finished with nobody: "No one matches"', () => {
		search('nobody', { persons: [], has_partial: false });
		expect(text()).toContain("No one matches 'nobody'");
		expect(text()).not.toContain('took too long');
	});

	it('a search that TIMED OUT with nobody: "The search took too long" and Try again, never "No one matches"', () => {
		search('slowquery', { persons: [], has_partial: true });
		expect(text()).toContain('The search took too long');
		expect(text()).not.toContain('No one matches');
		button('Try again')!.click();
		expect(h.state.refetch).toHaveBeenCalledTimes(1);
	});

	it('a search that timed out with some people: they are listed, and the page says some may be missing', () => {
		search('ali', { persons: [ALICE], has_partial: true });
		expect(text()).toContain('Alice Anderson');
		expect(text()).toContain('The search took too long');
		expect(text()).toContain('Some people may be missing from this list.');
		expect(button('Try again')).toBeDefined();
	});

	it('a search that finished with people says nothing about time', () => {
		search('ali', { persons: [ALICE], has_partial: false });
		expect(text()).toContain('Alice Anderson');
		expect(text()).not.toContain('took too long');
	});
});
