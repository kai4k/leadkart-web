import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const goFetch = vi.hoisted(() => vi.fn());

vi.mock('#lib/server/go.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	goFetch
}));
vi.mock('$api/jwt', () => ({ decodeJwtPrincipal: () => ({ tenantId: 't-1' }) }));
vi.mock('#lib/server/cookies.ts', () => ({ ACCESS_COOKIE: () => 'lk_access' }));

import { patchTenant } from '../../../src/routes/(app)/settings/tenant/_actions.ts';

describe('patchTenant', () => {
	it('answers a Go redirect (never followed) with a 502 failure, not a crash', async () => {
		goFetch.mockResolvedValue(
			new Response(null, { status: 302, headers: { location: 'https://elsewhere/' } })
		);
		const result = await patchTenant({
			cookies: { get: () => 'token' } as never,
			pathSuffix: '/profile',
			schema: z.object({ display_name: z.string() }),
			payload: { display_name: 'Acme' }
		});
		expect(result).toMatchObject({ status: 502 });
	});
});
