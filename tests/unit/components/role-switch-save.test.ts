import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';

const h = vi.hoisted(() => ({ qc: undefined as unknown as QueryClient }));
const role = (id: string) => ({
	id,
	name: `Role ${id}`,
	hierarchy_level: 5,
	permissions: [] as string[],
	parent_role_id: null,
	is_system_default: false,
	is_super_admin: false
});
vi.mock('@tanstack/svelte-query', async (importOriginal) =>
	(await import('../helpers/real-mutations.svelte.ts')).withRealMutations(
		await importOriginal(),
		() => h.qc,
		{
			createQuery: (opts: () => { queryKey: readonly string[] }) => {
				const key = opts().queryKey;
				const data =
					key[0] === 'me'
						? {
								permissions: ['identity.roles.update'],
								effective_permissions: ['identity.roles.update']
							}
						: key[1] === 'list'
							? { roles: [] }
							: role(String(key[2]));
				return { data, isPending: false, isError: false, error: null };
			}
		},
		{ swallowRejections: true }
	)
);
const toastMock = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
const empty = vi.hoisted(() => ({ default: undefined as unknown }));
vi.mock('$ui', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	toast: toastMock,
	// These need a Tooltip.Provider the test does not mount.
	CopyButton: (empty.default = (await import('../stubs/Empty.svelte')).default),
	Tooltip: Object.fromEntries(
		['Root', 'Trigger', 'Content', 'Provider'].map((n) => [n, empty.default])
	)
}));
const gw = vi.hoisted(() => ({ updateRole: vi.fn() }));
vi.mock('#lib/features/roles/api.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	...gw
}));
vi.mock('#lib/features/roles/api', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	...gw
}));
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import { createQueryClient } from '#lib/api/query-client.ts';
import { ServerError } from '#lib/api/errors.ts';
import RolePage from '../../../src/routes/(app)/settings/roles/[id]/+page.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: { data: { roleId: string } };

beforeEach(() => {
	vi.clearAllMocks();
	h.qc = createQueryClient();
	vi.spyOn(h.qc, 'invalidateQueries').mockResolvedValue(undefined);
	target = document.body.appendChild(document.createElement('div'));
	props = reactiveProps({ data: { roleId: 'r1' } });
	component = mount(RolePage, { target, props: props as never });
	flushSync();
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const saveProperties = () => {
	const name = document.querySelector<HTMLInputElement>('input[name="name"]')!;
	name.value = 'Renamed';
	name.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
	[...document.querySelectorAll('button')]
		.find((b) => b.textContent?.trim() === 'Save properties')!
		.click();
	flushSync();
};

describe('roles/[id]: a save whose role is no longer on screen', () => {
	it('role switched, then the save fails: exactly one toast', async () => {
		let reject!: (e: unknown) => void;
		gw.updateRole.mockReturnValue(new Promise((_r, rej) => (reject = rej)));
		saveProperties();
		await vi.waitFor(() => expect(gw.updateRole).toHaveBeenCalledTimes(1));

		props.data = { roleId: 'r2' };
		flushSync();
		reject(new ServerError(500, null));

		await vi.waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(1));
	});

	it('same role, still on screen: the failure is a banner, no toast', async () => {
		gw.updateRole.mockRejectedValue(new ServerError(500, null));
		saveProperties();
		await vi.waitFor(() =>
			expect(document.body.textContent).toContain('Something went wrong on our side')
		);
		expect(toastMock.error).not.toHaveBeenCalled();
	});
});
