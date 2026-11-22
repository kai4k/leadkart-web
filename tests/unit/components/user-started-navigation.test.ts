/**
 * A navigation the USER starts from the user menu or the command palette is a real link: the leave guard sees it as a
 * `link` navigation (a dirty form asks once; a clean one just goes), and open-in-new-tab / middle click work.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import { fakeRouter } from '../helpers/fake-router.svelte.ts';
import { guardInRoot } from '../helpers/guard-root.svelte.ts';

const router = vi.hoisted(() => ({ beforeNavigate: undefined as unknown as (cb: never) => void }));
vi.mock('$app/navigation', () => ({
	beforeNavigate: (cb: never) => router.beforeNavigate(cb),
	goto: vi.fn(() => {
		throw new Error('a user-started navigation must not use goto');
	}),
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
	omniSearchQuery: () => ({
		data: {
			persons: [{ id: 'p1', first_name: 'Ravi', last_name: 'Kumar', email: 'ravi@acme.test' }],
			tenants: []
		},
		isPending: false
	})
}));
vi.mock('$features/operator', () => ({ enterScopeMutation: () => ({ mutate: vi.fn() }) }));
vi.mock('#lib/config/nav.ts', () => ({ visibleNav: () => [] }));

import UserMenu from '#lib/layouts/UserMenu.svelte';
import CommandPalette from '#lib/features/search/components/CommandPalette.svelte';
import { releaseLeaveGuards } from '#lib/hooks/use-leave-guard.svelte.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let r: ReturnType<typeof fakeRouter>;
let dirty = false;
let disposeGuard: (() => void) | undefined;
let ask: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	Element.prototype.scrollIntoView = vi.fn();
	dirty = false;
	r = fakeRouter();
	router.beforeNavigate = r.beforeNavigate as never;
	ask = vi.spyOn(window, 'confirm').mockReturnValue(false);
	// the page's form, with or without unsaved input
	disposeGuard = guardInRoot(() => dirty);
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	disposeGuard?.();
	r.dispose();
	target.remove();
	document.body.innerHTML = '';
	releaseLeaveGuards(false);
	vi.restoreAllMocks();
});

const settle = async () => {
	flushSync();
	await new Promise((res) => setTimeout(res, 30));
	flushSync();
};

async function openUserMenu() {
	component = mount(UserMenu, { target });
	flushSync();
	const trigger = target.querySelector<HTMLElement>('[aria-haspopup="menu"]')!;
	trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	await settle();
	return document.querySelector<HTMLAnchorElement>('[role="menuitem"][href]');
}

async function openPalette() {
	const onOpenChange = vi.fn();
	component = mount(CommandPalette, { target, props: { open: true, onOpenChange } });
	await settle();
	const input = document.querySelector<HTMLInputElement>('input[aria-label="Search"]')!;
	input.value = 'ravi';
	input.dispatchEvent(new Event('input', { bubbles: true }));
	await settle();
	await tick();
	return {
		onOpenChange,
		link: document.querySelector<HTMLAnchorElement>('a[href*="operator/persons"]')
	};
}

describe('the user menu "Account" entry', () => {
	it('is a real link to the account page', async () => {
		const link = await openUserMenu();
		expect(link, 'a menu item rendered as <a href>').not.toBeNull();
		expect(link!.getAttribute('href')).toBe('settings/account/security');
		expect(link!.textContent).toContain('Account');
	});

	it('dirty form: asks once and stays when declined', async () => {
		dirty = true;
		const link = await openUserMenu();
		link!.click();
		expect(ask).toHaveBeenCalledTimes(1);
		expect(r.navigated).toEqual([]);
	});

	it('dirty form, confirmed: asks once and goes', async () => {
		dirty = true;
		ask.mockReturnValue(true);
		const link = await openUserMenu();
		link!.click();
		expect(ask).toHaveBeenCalledTimes(1);
		expect(r.navigated).toEqual(['settings/account/security']);
	});

	it('clean form: navigates without asking', async () => {
		const link = await openUserMenu();
		link!.click();
		expect(ask).not.toHaveBeenCalled();
		expect(r.navigated).toEqual(['settings/account/security']);
	});
});

describe('the command palette person hits', () => {
	it('is a real link to the person page', async () => {
		const { link } = await openPalette();
		expect(link, 'a person hit rendered as <a href>').not.toBeNull();
		expect(link!.getAttribute('href')).toContain('operator/persons');
	});

	it('dirty form: asks once and stays when declined', async () => {
		dirty = true;
		const { link } = await openPalette();
		link!.click();
		expect(ask).toHaveBeenCalledTimes(1);
		expect(r.navigated).toEqual([]);
	});

	it('clean form: navigates without asking, and the palette closes', async () => {
		const { link, onOpenChange } = await openPalette();
		link!.click();
		expect(ask).not.toHaveBeenCalled();
		expect(r.navigated).toHaveLength(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
