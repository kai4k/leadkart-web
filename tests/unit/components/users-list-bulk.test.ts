import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { QueryClient } from '@tanstack/svelte-query';
import type * as TanstackQuery from '@tanstack/svelte-query';

const h = vi.hoisted(() => ({ qc: undefined as unknown as QueryClient, users: [] as unknown[] }));
// Real mutation machinery (settling, toasts, invalidation) against a real QueryClient; queries
// are replaced with fixed data.
vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal<typeof TanstackQuery>();
	return {
		...actual,
		useQueryClient: () => h.qc,
		createMutation: (opts: () => never) => {
			const observer = new actual.MutationObserver(h.qc, opts());
			// The Svelte binding exposes mutateAsync; the bare observer's mutate() is that promise.
			return Object.assign(observer, {
				mutateAsync: (vars: never) => observer.mutate(vars),
				isPending: false
			});
		},
		createQuery: (
			opts: () => { queryKey: readonly string[]; select?: (r: unknown) => unknown }
		) => {
			const o = opts();
			const root = o.queryKey[0];
			const raw =
				root === 'users'
					? { items: h.users, truncated: false }
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
	};
});
const toastMock = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('$ui', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	toast: toastMock
}));
// The auth barrel also exports form components that need SvelteKit's form runtime.
vi.mock('$features/auth', async () => {
	const { displayName, initials } = await import('#lib/utils/person-name.ts');
	return { displayName, initials };
});
const gw = vi.hoisted(() => ({ deactivateUser: vi.fn(), reactivateUser: vi.fn() }));
vi.mock('#lib/features/users/api.ts', () => gw);
vi.mock('#lib/features/users/api', () => gw);

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
	h.qc = new QueryClient();
	vi.spyOn(h.qc, 'invalidateQueries').mockResolvedValue(undefined);
	h.users = [user(1), user(2), user(3)];
	target = document.body.appendChild(document.createElement('div'));
	component = mount(UsersList, { target });
	flushSync();
});
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
		expect(toastMock.warning.mock.calls[0]?.[0]).toBe('2 reactivated, 1 failed');
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
});
