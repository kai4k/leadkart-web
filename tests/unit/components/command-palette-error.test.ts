/**
 * A directory search that FAILED did not find "no matches": the palette says it could not search and offers to try
 * again. "No matches." is only said for a search that ran and found nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

const search = vi.hoisted(() => ({
	state: {} as Record<string, unknown>,
	refetch: undefined as unknown as () => Promise<void>
}));
vi.mock('$app/navigation', () => ({
	beforeNavigate: () => {},
	goto: vi.fn(),
	invalidate: vi.fn()
}));
vi.mock('$features/auth', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	session: {
		principal: { email: 'asha@acme.test' },
		capabilities: null,
		inTenantContext: false,
		canAny: () => true,
		can: () => true,
		logout: vi.fn()
	}
}));
vi.mock('$features/search/queries', () => ({
	omniSearchQuery: () => ({ ...search.state, refetch: () => search.refetch() })
}));
vi.mock('$features/operator', () => ({ enterScopeMutation: () => ({ mutate: vi.fn() }) }));
vi.mock('$app/state', () => ({ page: { data: {}, url: new URL('http://x/') } }));
vi.mock('#lib/config/nav.ts', () => ({ visibleNav: () => [] }));

import CommandPalette from '#lib/features/search/components/CommandPalette.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	Element.prototype.scrollIntoView = vi.fn();
	search.refetch = vi.fn(() => Promise.resolve());
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const settle = async () => {
	flushSync();
	await new Promise((res) => setTimeout(res, 30));
	flushSync();
};
async function searchFor(text: string) {
	component = mount(CommandPalette, { target, props: { open: true, onOpenChange: vi.fn() } });
	await settle();
	const input = document.querySelector<HTMLInputElement>('input[aria-label="Search"]')!;
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	await settle();
	await tick();
}
const text = () => document.body.textContent ?? '';

describe('the command palette directory search', () => {
	it('a failed search says it failed, never "No matches", and Try again runs it again', async () => {
		search.state = { data: undefined, isPending: false, isError: true };
		await searchFor('ravi');
		expect(text()).toContain('The search could not be completed');
		expect(text()).not.toContain('No matches');
		const retry = [...document.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Try again'
		)!;
		retry.click();
		expect(search.refetch).toHaveBeenCalledTimes(1);
	});

	it('a search that ran and found nothing says "No matches."', async () => {
		search.state = { data: { persons: [], tenants: [] }, isPending: false, isError: false };
		await searchFor('zzzz');
		expect(text()).toContain('No matches.');
		expect(text()).not.toContain('could not be completed');
	});
});
