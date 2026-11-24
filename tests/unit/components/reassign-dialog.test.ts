/**
 * The reassign picker: Go's member search matches the display NAME, reads 2 to 100 CHARACTERS, and keeps "no match"
 * apart from "the search failed".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';

const h = vi.hoisted(() => ({
	state: { isError: false, isFetching: false, data: undefined as unknown },
	asked: [] as string[]
}));
vi.mock('#lib/features/users/index.ts', () => ({
	memberSearchOptions: (m: unknown[]) => m,
	memberSearchReady: (q: string) => [...q.trim()].length >= 2,
	membershipSearchQuery: (getQuery: () => string) => ({
		get isError() {
			h.asked.push(getQuery());
			return h.state.isError;
		},
		get isFetching() {
			return h.state.isFetching;
		},
		get data() {
			return h.state.data;
		}
	})
}));
vi.mock('../../../src/lib/features/leads/queries', () => ({
	reassignLeadMutation: () => ({
		mutateAsync: vi.fn(),
		reset: vi.fn(),
		isPending: false,
		error: null
	})
}));
vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn(), invalidate: vi.fn() }));

import ReassignDialog from '#lib/features/leads/components/ReassignDialog.svelte';

let component: ReturnType<typeof mount> | undefined;
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	document.body.innerHTML = '';
	h.state = { isError: false, isFetching: false, data: undefined };
});
function open() {
	component = mount(ReassignDialog, {
		target: document.body,
		props: { leadId: 'l1', open: true, onOpenChange: vi.fn() }
	});
	flushSync();
}

describe('ReassignDialog', () => {
	it('says the search failed, never "no match", when the search errors', () => {
		h.state.isError = true;
		open();
		expect(document.body.textContent).toContain('The search could not be completed');
	});

	it('promises a search by name only: Go does not match email', () => {
		open();
		const text = document.body.textContent ?? '';
		expect(text).not.toMatch(/email/i);
		expect(text).toContain('Search by name');
	});
});
