/**
 * Add user: the password hint is the policy of the company the password is FOR. A company admin adds into their
 * own company (their capabilities policy); an operator acting in a tenant scope adds into the SCOPED company
 * (Go user_create.go uses the target company's effective policy), whose policy the scope's tenant read carries.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';

const h = vi.hoisted(() => ({
	qc: undefined as unknown as QueryClient,
	capabilities: undefined as unknown
}));
vi.mock('@tanstack/svelte-query', async (importOriginal) =>
	(await import('../helpers/real-mutations.svelte.ts')).withRealMutations(
		await importOriginal(),
		() => h.qc
	)
);
vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn(), invalidate: vi.fn() }));
vi.mock('#lib/api/capabilities-refresh.ts', () => ({ refreshCapabilities: vi.fn() }));
vi.mock('$features/auth', () => ({
	session: {
		get capabilities() {
			return h.capabilities;
		}
	}
}));
const gw = vi.hoisted(() => ({ createUser: vi.fn() }));
vi.mock('#lib/features/users/api.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	...gw
}));
vi.mock('#lib/features/users/api', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	...gw
}));

import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import { createQueryClient } from '#lib/api/query-client.ts';
import CreateUserDrawer from '#lib/features/users/components/CreateUserDrawer.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const onOpenChange = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	h.qc = createQueryClient();
	vi.spyOn(h.qc, 'invalidateQueries').mockResolvedValue(undefined);
	target = document.body.appendChild(document.createElement('div'));
	h.capabilities = {
		password_policy: {
			min_length: 12,
			requires_uppercase: true,
			requires_lowercase: false,
			requires_digit: false,
			requires_symbol: false
		}
	};
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const mountDrawer = (extra: Partial<ComponentProps<typeof CreateUserDrawer>> = {}) => {
	const props = reactiveProps<ComponentProps<typeof CreateUserDrawer>>({
		open: true,
		onOpenChange,
		...extra
	});
	component = mount(CreateUserDrawer, { target, props });
	flushSync();
	return props;
};

describe('Add user password hint', () => {
	it('in the caller’s own company it is the caller’s capabilities policy', () => {
		mountDrawer();
		expect(document.body.textContent).toContain(
			'At least 12 characters, with an uppercase letter.'
		);
	});

	it('for an operator in a tenant scope it is the SCOPED company’s policy, not the operator’s own', () => {
		mountDrawer({
			passwordPolicy: {
				min_length: 9,
				requires_uppercase: false,
				requires_lowercase: true,
				requires_digit: true,
				requires_symbol: false
			}
		});
		const text = document.body.textContent ?? '';
		expect(text).toContain('At least 9 characters, with a lowercase letter and a digit.');
		expect(text).not.toContain('At least 12 characters');
	});
});
