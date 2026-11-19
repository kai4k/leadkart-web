import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/svelte-query', () => ({ createQuery: vi.fn() }));
vi.mock('#lib/api/mutations.ts', () => ({
	createResourceMutation: (o: unknown) => o
}));
import { deactivateUserMutation, reactivateUserMutation } from '#lib/features/users/queries.ts';
import { setRoleParentMutation, updateRoleMutation } from '#lib/features/roles/queries.ts';

type Opts<V> = { invalidate: (v: V) => unknown[]; inlineErrors?: boolean };

describe('204 mutations invalidate list and detail keys', () => {
	it('deactivate: detail + list, inline errors', () => {
		const o = deactivateUserMutation() as unknown as Opts<{ id: string; reason: string }>;
		expect(o.invalidate({ id: 'm1', reason: 'x' })).toEqual([
			['users', 'detail', 'm1'],
			['users', 'list']
		]);
		expect(o.inlineErrors).toBe(true);
	});
	it('reactivate: detail + list', () => {
		const o = reactivateUserMutation() as unknown as Opts<string>;
		expect(o.invalidate('m1')).toEqual([
			['users', 'detail', 'm1'],
			['users', 'list']
		]);
	});
	it('role update: detail + roles prefix; set-parent: roles prefix', () => {
		const u = updateRoleMutation() as unknown as Opts<{ id: string }>;
		expect(u.invalidate({ id: 'r1' })).toEqual([['roles', 'detail', 'r1'], ['roles']]);
		const p = setRoleParentMutation() as unknown as Opts<unknown>;
		expect(p.invalidate({})).toEqual([['roles']]);
	});
});
