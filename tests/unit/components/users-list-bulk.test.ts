import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { createListSearch } from '#lib/hooks/use-list-search.svelte.ts';
import type { QueryClient } from '@tanstack/svelte-query';

const h = vi.hoisted(() => ({
	qc: undefined as unknown as QueryClient,
	users: [] as unknown[],
	counts: { active: 3, inactive: 1 },
	// the status the list asked Go for, by query key
	asked: [] as string[]
}));
// Real mutation machinery (settling, toasts, invalidation) against a real QueryClient; queries
// are replaced with fixed data.
vi.mock('@tanstack/svelte-query', async (importOriginal) =>
	(await import('../helpers/real-mutations.svelte.ts')).withRealMutations(
		await importOriginal(),
		() => h.qc,
		{
			createQuery: (
				opts: () => { queryKey: readonly string[]; select?: (r: unknown) => unknown }
			) => {
				const o = opts();
				const root = o.queryKey[0];
				if (root === 'users' && o.queryKey[1] === 'list') h.asked.push(String(o.queryKey[2]));
				const raw =
					root === 'users'
						? { items: h.users, truncated: false, counts: h.counts }
						: root === 'roles'
							? { roles: [] }
							: undefined;
				return {
					data: o.select && raw ? o.select(raw) : raw,
					isPending: false,
					isError: false,
					error: null
				};
			}
		}
	)
);
const toastMock = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('$ui', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	toast: toastMock
}));
// The auth barrel also exports form components that need SvelteKit's form runtime.
vi.mock('$features/auth', async () => {
	const { displayName, initials } = await import('#lib/utils/person-name.ts');
	const { ACTION } = await import('#lib/features/auth/permissions.ts');
	const { userStatus } = await import('#lib/features/auth/view-models.ts');
	// The caller holds the bulk routes' permissions (the list shows only what Go would allow).
	const held: string[] = [...ACTION.userDeactivate, ...ACTION.userReactivate];
	return {
		displayName,
		initials,
		userStatus,
		ACTION,
		session: { canAny: (...perms: string[]) => perms.some((p) => held.includes(p)) }
	};
});
// A reactive page URL: the list reads its page, search and status from it, and goto() moves it.
const nav = vi.hoisted(() => ({ page: undefined as unknown as { url: URL } }));
vi.mock('$app/state', async () => {
	const { createReactiveUrlPage } = await import('../helpers/reactive-page.svelte.ts');
	nav.page = createReactiveUrlPage(new URL('http://localhost/settings/users'));
	return { page: nav.page };
});
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	goto: vi.fn((to: string) => {
		nav.page.url = new URL(to, 'http://localhost');
		return Promise.resolve();
	})
}));
const gw = vi.hoisted(() => ({ deactivateUser: vi.fn(), reactivateUser: vi.fn() }));
vi.mock('#lib/features/users/api.ts', () => gw);
vi.mock('#lib/features/users/api', () => gw);

import { createQueryClient } from '#lib/api/query-client.ts';
import { ApiError } from '#lib/api/errors.ts';
import UsersList from '#lib/features/users/components/UsersList.svelte';

const user = (n: number) => ({
	membership_id: `m${n}`,
	person_id: `p${n}`,
	tenant_id: 't1',
	email: `user${n}@example.com`,
	first_name: `User${n}`,
	last_name: 'Test',
	status: 'active' as const,
	designation: '',
	department: '',
	status_message: '',
	role_ids: []
});

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

beforeEach(() => {
	vi.clearAllMocks();
	// The real client: its MutationCache owns the one global error toast.
	h.qc = createQueryClient();
	vi.spyOn(h.qc, 'invalidateQueries').mockResolvedValue(undefined);
	h.asked = [];
	h.counts = { active: 3, inactive: 1 };
	h.users = [user(1), user(2), user(3)];
	target = document.body.appendChild(document.createElement('div'));
	// every bulk action is on the page for All; the chips describe the default (Active) in their own tests
	open('?status=all');
});
function open(query = '') {
	if (component) unmount(component);
	nav.page.url = new URL(`http://localhost/settings/users${query}`);
	component = mount(UsersList, { target, props: { search: createListSearch() } });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const checkboxes = () =>
	[...document.querySelectorAll<HTMLElement>('[role="checkbox"], input[type="checkbox"]')].filter(
		(c) => /Select User/.test(c.getAttribute('aria-label') ?? '')
	);
const buttonNamed = (name: string) =>
	[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === name);
const isChecked = (el: HTMLElement) =>
	el.getAttribute('aria-checked') === 'true' || (el as HTMLInputElement).checked === true;

describe('UsersList status chips (nobody is deleted: Active, Inactive, All)', () => {
	const chipText = () =>
		[
			...document.querySelectorAll('[role="group"][aria-label="Filter members by status"] button')
		].map((b) => b.textContent?.replace(/\s+/g, ' ').trim());

	it('offers All, Active and Inactive with the counts from Go, and starts on Active', () => {
		h.asked = [];
		open();
		expect(chipText()).toEqual(['All', 'Active 3', 'Inactive 1']);
		const on = [
			...document.querySelectorAll(
				'[role="group"][aria-label="Filter members by status"] [data-state="on"]'
			)
		];
		expect(on.map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Active 3']);
		expect(h.asked.every((s) => s === 'active')).toBe(true);
	});

	it('?status=inactive asks Go for the inactive members; ?status=all for everyone; junk reads as Active', () => {
		h.asked = [];
		open('?status=inactive');
		expect(h.asked).toContain('inactive');
		h.asked = [];
		open('?status=all');
		expect(h.asked).toContain('all');
		h.asked = [];
		open('?status=nonsense');
		expect(h.asked.every((s) => s === 'active')).toBe(true);
	});

	it('choosing Inactive puts ?status=inactive in the URL; Active takes it out again; All says all', () => {
		open();
		const chip = (name: string) =>
			[
				...document.querySelectorAll<HTMLElement>(
					'[role="group"][aria-label="Filter members by status"] button'
				)
			].find((b) => b.textContent?.trim().startsWith(name))!;
		chip('Inactive').click();
		flushSync();
		expect(nav.page.url.searchParams.get('status')).toBe('inactive');
		chip('Active').click();
		flushSync();
		expect(nav.page.url.searchParams.get('status')).toBeNull();
		chip('All').click();
		flushSync();
		expect(nav.page.url.searchParams.get('status')).toBe('all');
	});

	it('only the bulk action that can apply is offered: Deactivate on Active, Reactivate on Inactive', () => {
		open();
		checkboxes()[0]!.click();
		flushSync();
		expect(buttonNamed('Deactivate')).toBeDefined();
		expect(buttonNamed('Reactivate')).toBeUndefined();
		open('?status=inactive');
		checkboxes()[0]!.click();
		flushSync();
		expect(buttonNamed('Deactivate')).toBeUndefined();
		expect(buttonNamed('Reactivate')).toBeDefined();
	});

	it('an empty Inactive list says so, and does not offer to add a member', () => {
		h.users = [];
		open('?status=inactive');
		expect(document.body.textContent).toContain('No inactive members');
		// only the header's button: the empty state offers none
		expect(
			[...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Add member')
		).toHaveLength(1);
	});

	it('promises no deletion: the bulk confirm says the member stays under Inactive', async () => {
		open();
		checkboxes()[0]!.click();
		flushSync();
		buttonNamed('Deactivate')?.click();
		await vi.waitFor(() => expect(document.body.textContent).toContain('stay under Inactive'));
	});
});

describe('UsersList bulk status change', () => {
	it('settles when the 2nd call rejects: one warning toast, the failed row stays selected', async () => {
		gw.reactivateUser
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('nope'))
			.mockResolvedValueOnce(undefined);

		const boxes = checkboxes();
		expect(boxes).toHaveLength(3);
		for (const b of boxes) b.click();
		flushSync();
		expect(boxes.every(isChecked)).toBe(true);

		buttonNamed('Reactivate')?.click(); // no confirm step, same bulk path as deactivate

		await vi.waitFor(() => expect(toastMock.warning).toHaveBeenCalledTimes(1));
		flushSync();
		expect(toastMock.warning.mock.calls[0]?.[0]).toBe(
			'2 reactivated, 1 failed: Something went wrong'
		);
		expect(toastMock.success).not.toHaveBeenCalled();
		expect(gw.reactivateUser).toHaveBeenCalledTimes(3);

		// The action settled (no hang), the failed member is still selected, the others are not.
		const after = checkboxes();
		expect(after.map(isChecked)).toEqual([false, true, false]);
		await vi.waitFor(() => {
			const retry = buttonNamed('Reactivate');
			expect(retry).toBeDefined();
			expect((retry as HTMLButtonElement).disabled).toBe(false);
		});
	});
	it('when every call fails: the whole selection stays, exactly one error toast, no summary toast', async () => {
		gw.deactivateUser.mockRejectedValue(new ApiError(500));
		for (const b of checkboxes()) b.click();
		flushSync();

		buttonNamed('Deactivate')?.click();
		// Deactivate asks for confirmation first.
		await vi.waitFor(() => expect(buttonNamed('Deactivate')).toBeDefined());
		const confirm = [...document.querySelectorAll('button')]
			.filter((b) => b.textContent?.trim() === 'Deactivate')
			.at(-1);
		confirm?.click();

		await vi.waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(1));
		flushSync();
		expect(toastMock.error).toHaveBeenCalledWith(new ApiError(500).message);
		expect(toastMock.warning).not.toHaveBeenCalled();
		expect(toastMock.success).not.toHaveBeenCalled();
		expect(gw.deactivateUser).toHaveBeenCalledTimes(3);
		expect(checkboxes().every(isChecked)).toBe(true);
	});
});

describe('UsersList selection and paging', () => {
	it('a member ticked on page 1 is not selected on page 2: a bulk action reaches only the rows shown', async () => {
		h.users = Array.from({ length: 12 }, (_, i) => user(i + 1));
		open('?status=all');
		checkboxes()[0]!.click();
		flushSync();
		expect(document.body.textContent).toContain('1 selected');

		document.querySelector<HTMLElement>('button[aria-label="Next page"]')!.click();
		flushSync();
		expect(nav.page.url.searchParams.get('page')).toBe('2');
		await vi.waitFor(() => expect(document.body.textContent).not.toContain('1 selected'));
		expect(checkboxes().some(isChecked)).toBe(false);
		// and nothing is sent for a row that is not on screen
		expect(buttonNamed('Deactivate')).toBeUndefined();
	});

	it('the selection survives while the page stays the same', () => {
		checkboxes()[0]!.click();
		flushSync();
		expect(document.body.textContent).toContain('1 selected');
		flushSync();
		expect(checkboxes().map(isChecked)).toEqual([true, false, false]);
	});
});
