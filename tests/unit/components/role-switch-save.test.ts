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
				const data = key[1] === 'list' ? { roles: [] } : role(String(key[2]));
				return { data, isPending: false, isError: false, error: null };
			}
		},
		{ swallowRejections: true }
	)
);
// The page reads what Go said about the caller from page.data (session.can).
vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/'),
		data: { capabilities: { effective_permissions: ['identity.roles.update'] } }
	}
}));
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
import { ServerError, ValidationError } from '#lib/api/errors.ts';
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

describe('roles/[id]: the properties are checked before anything is sent', () => {
	const field = (name: string) =>
		document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
	const typeInto = (name: string, value: string) => {
		field(name).value = value;
		field(name).dispatchEvent(new Event('input', { bubbles: true }));
		field(name).dispatchEvent(new FocusEvent('blur'));
		field(name).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
		flushSync();
	};
	const save = () => {
		[...document.querySelectorAll('button')]
			.find((b) => b.textContent?.trim() === 'Save properties')!
			.click();
		flushSync();
	};
	const errorOf = (name: string) =>
		document.getElementById(field(name).getAttribute('aria-describedby')?.split(' ')[0] ?? '')
			?.textContent;

	it('a blank name is an error on the field: nothing is sent and nothing says Saved (Go reads it as "no rename" and answers 204)', async () => {
		gw.updateRole.mockResolvedValue(undefined);
		typeInto('name', '   ');
		save();
		await new Promise((r) => setTimeout(r, 20));
		expect(gw.updateRole).not.toHaveBeenCalled();
		expect(field('name').getAttribute('aria-invalid')).toBe('true');
		expect(errorOf('name')).toBe('Role name is too short.');
		expect(document.body.textContent).not.toContain('Saved.');
	});

	it('a blank level is an error on the field, not a save of the old level', async () => {
		gw.updateRole.mockResolvedValue(undefined);
		typeInto('hierarchy_level', '');
		save();
		await new Promise((r) => setTimeout(r, 20));
		expect(gw.updateRole).not.toHaveBeenCalled();
		expect(field('hierarchy_level').getAttribute('aria-invalid')).toBe('true');
		expect(document.body.textContent).not.toContain('Saved.');
	});

	it('a valid change sends the trimmed name and the level, then says Saved', async () => {
		gw.updateRole.mockResolvedValue(undefined);
		typeInto('name', '  Area lead  ');
		save();
		await vi.waitFor(() => expect(gw.updateRole).toHaveBeenCalledTimes(1));
		expect(gw.updateRole).toHaveBeenCalledWith('r1', { name: 'Area lead', hierarchy_level: 5 });
		await vi.waitFor(() => expect(document.body.textContent).toContain('Saved.'));
	});

	it("Go's refusal of a field lands on that field", async () => {
		gw.updateRole.mockRejectedValue(new ValidationError({ name: 'too_long' }, 422));
		typeInto('name', 'Renamed');
		save();
		await vi.waitFor(() => expect(field('name').getAttribute('aria-invalid')).toBe('true'));
		expect(errorOf('name')).toBe('This is too long.');
		expect(toastMock.error).not.toHaveBeenCalled();
	});
});

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
