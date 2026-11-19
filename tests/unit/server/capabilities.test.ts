import { describe, expect, it, vi } from 'vitest';

const goFetch = vi.hoisted(() => vi.fn());
const readGoJson = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/go.ts', () => ({ goFetch, readGoJson }));

import { loadCapabilities } from '#lib/server/capabilities.ts';

describe('loadCapabilities failures', () => {
	it('answers 504 when Go times out (first byte or body)', async () => {
		goFetch.mockRejectedValueOnce(new DOMException('Upstream timed out', 'TimeoutError'));
		await expect(loadCapabilities({} as never)).rejects.toMatchObject({ status: 504 });
		goFetch.mockRejectedValueOnce(
			new TypeError('terminated', { cause: { code: 'UND_ERR_BODY_TIMEOUT' } })
		);
		await expect(loadCapabilities({} as never)).rejects.toMatchObject({ status: 504 });
	});

	it('answers 503 when Go is unreachable', async () => {
		goFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
		await expect(loadCapabilities({} as never)).rejects.toMatchObject({ status: 503 });
	});
});

describe('loadCapabilities success', () => {
	it('returns caps (not null) when Go omits email / first_name / last_name', async () => {
		goFetch.mockResolvedValueOnce({ ok: true });
		readGoJson.mockResolvedValueOnce({
			person_id: '00000000-0000-4000-8000-000000000001',
			membership_id: '00000000-0000-4000-8000-000000000002',
			tenant_id: '00000000-0000-4000-8000-000000000003',
			tenant_slug: 'acme',
			is_platform: false,
			is_super_user: false,
			permissions: [],
			effective_permissions: [],
			roles: []
		});
		const caps = await loadCapabilities({} as never);
		expect(caps).not.toBeNull();
		expect(caps?.email).toBeUndefined();
	});
});
