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

describe('loadCapabilities contract mismatch', () => {
	it('logs once (path + issue message, never the value) and answers 502, not a sign-in loop', async () => {
		const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
		goFetch.mockResolvedValueOnce({ ok: true });
		readGoJson.mockResolvedValueOnce({ person_id: 'secret-person-value', permissions: 'nope' });
		const err = await loadCapabilities({} as never).catch((e: unknown) => e);
		expect(err).toMatchObject({ status: 502 });
		expect(JSON.stringify(err)).not.toContain('secret-person-value');
		expect(warn).toHaveBeenCalledTimes(1);
		const line = warn.mock.calls[0].map(String).join(' ');
		expect(line).toContain('permissions');
		expect(line).not.toContain('secret-person-value');
		warn.mockRestore();
	});

	it('an empty 2xx body is not a parse failure: no usable capabilities, the caller signs in', async () => {
		goFetch.mockResolvedValueOnce({ ok: true });
		readGoJson.mockResolvedValueOnce(null);
		await expect(loadCapabilities({} as never)).resolves.toBeNull();
	});

	it('stays quiet when Go simply answered non-2xx', async () => {
		const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
		goFetch.mockResolvedValueOnce({ ok: false });
		await expect(loadCapabilities({} as never)).resolves.toBeNull();
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
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
			roles: [],
			rank: 99,
			tier: 'user',
			must_change_password: false,
			password_policy: {
				min_length: 8,
				max_length: 1024,
				requires_uppercase: true,
				requires_lowercase: true,
				requires_digit: true,
				requires_symbol: true
			}
		});
		const caps = await loadCapabilities({} as never);
		expect(caps).not.toBeNull();
		expect(caps?.email).toBeUndefined();
	});
});
