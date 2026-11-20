import { beforeEach, describe, expect, it, vi } from 'vitest';

const goAuthFetch = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/go.ts', async () => ({
	...(await vi.importActual<Record<string, unknown>>('#lib/server/go.ts')),
	goAuthFetch
}));

import { POST } from '../../../src/routes/auth/confirm-email-change/+server.ts';

const post = (body: unknown) =>
	(POST as (e: never) => Promise<Response>)({
		request: new Request('http://x/auth/confirm-email-change', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		})
	} as never);

beforeEach(() => {
	goAuthFetch.mockReset();
	goAuthFetch.mockResolvedValue(new Response(null, { status: 204 }));
});

describe('POST /auth/confirm-email-change', () => {
	it('forwards ONLY the token to Go', async () => {
		const r = await post({ token: 'abc' });
		expect(r.status).toBe(204);
		expect(goAuthFetch).toHaveBeenCalledWith('/v1/auth/confirm-email-change', {
			body: { token: 'abc' }
		});
	});

	it.each([
		['extra fields', { token: 'abc', new_email: 'x@y.co' }],
		['no token', {}],
		['an empty token', { token: '' }],
		['a token over 512 characters', { token: 't'.repeat(513) }],
		['a non-string token', { token: { $ne: 1 } }],
		['an array body', ['x']]
	])('400 and no Go call for %s', async (_n, body) => {
		const r = await post(body);
		expect(r.status).toBe(400);
		expect(goAuthFetch).not.toHaveBeenCalled();
	});

	it('400 for invalid JSON', async () => {
		expect((await post('{nope')).status).toBe(400);
	});

	it('answers a timeout as 504 and a transport failure as 502 (the one upstream envelope)', async () => {
		goAuthFetch.mockRejectedValue(new DOMException('slow', 'TimeoutError'));
		expect((await post({ token: 'abc' })).status).toBe(504);
		goAuthFetch.mockRejectedValue(new TypeError('fetch failed'));
		expect((await post({ token: 'abc' })).status).toBe(502);
	});
});
