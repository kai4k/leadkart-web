/** The tenant save path sends what the schema PARSED (the one value that was validated), not the raw payload. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { caps } from '../../support/go-personas.ts';

const patchTenant = vi.hoisted(() => vi.fn());
const loadCapabilities = vi.hoisted(() => vi.fn());
vi.mock('$features/tenant/server', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	patchTenant,
	ownTenantId: () => 't-1'
}));
vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
vi.mock('#lib/server/scope.ts', () => ({
	readOperatorScope: () => ({ state: 'none' }),
	scopeFingerprint: (r: { state: string }) => r.state
}));

import { saveTenantSection } from '../../../src/routes/(app)/settings/tenant/_actions.ts';

beforeEach(() => {
	vi.clearAllMocks();
	loadCapabilities.mockResolvedValue(caps(['identity.tenants.update']));
	patchTenant.mockResolvedValue({ ok: true, resp: new Response(null, { status: 204 }) });
});

describe('saveTenantSection', () => {
	it('PATCHes the parsed value: a field the schema does not know never travels', async () => {
		const payload = { legal_name: 'Acme', display_name: 'A', smuggled: 'x' };
		await saveTenantSection({
			event: {
				cookies: { get: () => 'tok' },
				route: { id: '/(app)/settings/tenant/profile' }
			} as never,
			form: new URLSearchParams({ scope_context: 'none' }) as never,
			section: 'profile',
			payload
		});
		expect(patchTenant).toHaveBeenCalledTimes(1);
		const sent = patchTenant.mock.calls[0]![3] as Record<string, unknown>;
		expect(sent).toEqual({ legal_name: 'Acme', display_name: 'A' });
		expect(sent).not.toBe(payload);
	});
});
