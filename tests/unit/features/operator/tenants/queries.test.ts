import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import type * as TanstackQuery from '@tanstack/svelte-query';

const h = vi.hoisted(() => ({ qc: undefined as unknown as QueryClient }));
vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal<typeof TanstackQuery>();
	return {
		...actual,
		createQuery: vi.fn(),
		useQueryClient: () => h.qc,
		createMutation: (opts: () => never) => new actual.MutationObserver(h.qc, opts())
	};
});
vi.mock('$ui', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
const gw = vi.hoisted(() => ({ registerTenant: vi.fn() }));
vi.mock('#lib/features/operator/tenants/api.ts', () => gw);
vi.mock('#lib/features/operator/tenants/api', () => gw);

import { registerTenantMutation } from '#lib/features/operator/tenants/queries.ts';

beforeEach(() => {
	vi.clearAllMocks();
	h.qc = new QueryClient();
});

describe('tenant mutations', () => {
	it('register shows its error in the drawer banner, so the global toast is skipped', () => {
		const m = registerTenantMutation() as unknown as { options: { meta?: object } };
		expect(m.options.meta).toEqual({ skipErrorToast: true });
	});
});
