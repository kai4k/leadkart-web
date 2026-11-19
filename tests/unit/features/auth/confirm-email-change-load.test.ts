import { describe, expect, it, vi } from 'vitest';
import { load } from '../../../../src/routes/(auth)/confirm-email-change/+page.ts';

const run = (status: number | Error, token = 't') => {
	const fetch = vi.fn(() =>
		status instanceof Error
			? Promise.reject(status)
			: Promise.resolve(new Response(status === 204 ? null : '{}', { status }))
	);
	return (load as unknown as (e: object) => Promise<{ phase: string }>)({
		url: new URL(`http://x/confirm-email-change?token=${token}`),
		fetch
	});
};

describe('confirm-email-change load', () => {
	it('no token -> missing; 204 -> success', async () => {
		expect((await run(204, '')).phase).toBe('missing');
		expect((await run(204)).phase).toBe('success');
	});

	it('Go refused the token (400 / 404 / 409) -> invalid', async () => {
		for (const status of [400, 404, 409]) expect((await run(status)).phase).toBe('invalid');
	});

	it('5xx / 502 / 504 / transport failure -> unreachable: the token is still valid', async () => {
		for (const status of [500, 502, 503, 504])
			expect((await run(status)).phase).toBe('unreachable');
		expect((await run(new TypeError('failed'))).phase).toBe('unreachable');
	});

	it('429 -> rate limited: the token is still valid', async () => {
		expect((await run(429)).phase).toBe('rateLimited');
	});
});
