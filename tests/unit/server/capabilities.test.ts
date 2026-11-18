import { describe, expect, it, vi } from 'vitest';

const goFetch = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/go.ts', () => ({ goFetch, readGoJson: vi.fn() }));

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
