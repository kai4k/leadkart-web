import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { api, apiLegacy, buildQueryString, parseResponse } from '#lib/api/client.ts';
import { ConflictError, SchemaError, TimeoutError } from '#lib/api/errors.ts';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => {
	fetchMock.mockReset();
	vi.unstubAllGlobals();
	vi.stubGlobal('fetch', fetchMock);
});
const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const sentHeaders = (): Headers => (fetchMock.mock.calls[0][1] as RequestInit).headers as Headers;

describe('api client v2', () => {
	it('get parses with the schema and sends the query', async () => {
		fetchMock.mockResolvedValue(json(200, { n: 1 }));
		const out = await api.get('/v1/x', z.object({ n: z.number() }), {
			query: { a: 'b', c: undefined, s: ['p', 'q'] }
		});
		expect(out).toEqual({ n: 1 });
		expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/x?a=b&s=p&s=q');
	});
	it('get throws SchemaError when the body does not match', async () => {
		fetchMock.mockResolvedValue(json(200, { n: 'one' }));
		await expect(api.get('/v1/x', z.object({ n: z.number() }))).rejects.toBeInstanceOf(SchemaError);
	});
	it('post resolves on 204 and on 201 with an id body', async () => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
		await expect(api.post('/v1/x', { a: 1 })).resolves.toBeUndefined();
		fetchMock.mockResolvedValueOnce(json(201, { call_id: 'c' }));
		await expect(api.post('/v1/x')).resolves.toBeUndefined();
	});
	it('postJson parses the body', async () => {
		fetchMock.mockResolvedValue(json(201, { id: 'q1' }));
		await expect(api.postJson('/v1/x', {}, z.object({ id: z.string() }))).resolves.toEqual({
			id: 'q1'
		});
	});
	it('throws the typed error on non-2xx', async () => {
		fetchMock.mockResolvedValue(json(409, { error: 'lead_terminal' }));
		await expect(api.post('/v1/x')).rejects.toBeInstanceOf(ConflictError);
	});
	it('maps its own timeout to TimeoutError', async () => {
		fetchMock.mockRejectedValue(new DOMException('t', 'TimeoutError'));
		await expect(api.get('/v1/x', z.unknown())).rejects.toBeInstanceOf(TimeoutError);
	});
	it('rethrows a caller abort unchanged (TanStack cancellation)', async () => {
		const ctrl = new AbortController();
		ctrl.abort(new DOMException('cancelled', 'AbortError'));
		fetchMock.mockRejectedValue(new DOMException('cancelled', 'AbortError'));
		await expect(api.get('/v1/x', z.unknown(), { signal: ctrl.signal })).rejects.toMatchObject({
			name: 'AbortError'
		});
	});
	it('buildQueryString drops empty values', () => {
		expect(buildQueryString({ a: '', b: null, c: 0, d: false })).toBe('?c=0&d=false');
	});
	it('sends the CSRF header on mutations only', async () => {
		vi.stubGlobal('document', { cookie: 'lk_csrf=tok123' });
		fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
		await api.post('/v1/x');
		expect(sentHeaders().get('X-CSRF-Token')).toBe('tok123');
		fetchMock.mockReset();
		fetchMock.mockResolvedValue(json(200, {}));
		await api.get('/v1/x', z.unknown());
		expect(sentHeaders().get('X-CSRF-Token')).toBeNull();
	});
	it('marks operator-scope pages with the scope-required header', async () => {
		vi.stubGlobal('location', { pathname: '/operator/scope/profile' });
		fetchMock.mockResolvedValue(json(200, {}));
		await api.get('/v1/x', z.unknown());
		expect(sentHeaders().get('x-lk-scope-required')).toBe('1');
	});
});

describe('legacy alias', () => {
	it('apiLegacy returns parsed JSON, or null on an empty body', async () => {
		fetchMock.mockResolvedValueOnce(json(200, { a: 1 }));
		await expect(apiLegacy.get('/v1/x')).resolves.toEqual({ a: 1 });
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
		await expect(apiLegacy.post('/v1/x', {})).resolves.toBeNull();
	});
	it('parseResponse throws SchemaError', () => {
		expect(() => parseResponse(z.object({ n: z.number() }), { n: 'x' })).toThrow(SchemaError);
	});
});
