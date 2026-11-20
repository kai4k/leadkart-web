import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pageData = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock('$app/state', () => ({ page: pageData }));

import { z } from 'zod';
import { api, apiLegacy, buildQueryString, parseResponse } from '#lib/api/client.ts';
import { ConflictError, ScopeChangedError, SchemaError, TimeoutError } from '#lib/api/errors.ts';

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
	it('sends the context the page shows on every call, reads and writes alike', async () => {
		pageData.data = { scopeContext: 'fp-tenant-a' };
		fetchMock.mockImplementation(() => Promise.resolve(json(200, {})));
		await api.get('/v1/x', z.unknown());
		expect(sentHeaders().get('x-lk-scope-context')).toBe('fp-tenant-a');
		fetchMock.mockClear();
		await api.post('/v1/x', {});
		expect(sentHeaders().get('x-lk-scope-context')).toBe('fp-tenant-a');
	});
	it('reads the fingerprint of the COMMITTED page data at send time: a new commit is followed, nothing else moves it', async () => {
		fetchMock.mockImplementation(() => Promise.resolve(json(200, {})));
		pageData.data = { scopeContext: 'fp-committed-1' };
		await api.get('/v1/x', z.unknown());
		expect(sentHeaders().get('x-lk-scope-context')).toBe('fp-committed-1');
		// A preload runs the layout load and holds ITS data elsewhere: the page's data is untouched.
		fetchMock.mockClear();
		await api.get('/v1/x', z.unknown());
		expect(sentHeaders().get('x-lk-scope-context')).toBe('fp-committed-1');
		pageData.data = { scopeContext: 'fp-committed-2' }; // a navigation committed
		fetchMock.mockClear();
		await api.get('/v1/x', z.unknown());
		expect(sentHeaders().get('x-lk-scope-context')).toBe('fp-committed-2');
	});
	it('no load sets the fingerprint: the (app) layout has no universal load and no holder exists', () => {
		expect(existsSync('src/routes/(app)/+layout.ts')).toBe(false);
		expect(existsSync('src/lib/api/scope-context.ts')).toBe(false);
	});
	it('sends none of its own when the page has no context yet (the proxy then refuses)', async () => {
		pageData.data = {};
		fetchMock.mockResolvedValue(json(200, {}));
		await api.get('/v1/x', z.unknown());
		expect(sentHeaders().has('x-lk-scope-context')).toBe(false);
	});
	it('a browser-set X-Tenant-Id or context header is replaced, never trusted', async () => {
		pageData.data = { scopeContext: 'fp-real' };
		fetchMock.mockResolvedValue(json(200, {}));
		await api.get('/v1/x', z.unknown(), { headers: { 'x-lk-scope-context': 'forged' } });
		expect(sentHeaders().get('x-lk-scope-context')).toBe('fp-real');
	});
});

describe('multipart and downloads go through the same transport', () => {
	it('postForm sends the form untouched (no JSON content type), with CSRF and the page context, and parses the answer', async () => {
		vi.stubGlobal('document', { cookie: 'lk_csrf=tok9' });
		pageData.data = { scopeContext: 'fp-form' };
		fetchMock.mockResolvedValue(json(200, { rows: 3 }));
		const form = new FormData();
		form.append('file', new Blob(['a,b']), 'x.csv');
		const out = await api.postForm(
			'/v1/crm/leads/bulk-upload/preview',
			form,
			z.object({ rows: z.number() })
		);
		expect(out).toEqual({ rows: 3 });
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/api/v1/crm/leads/bulk-upload/preview');
		expect(init.method).toBe('POST');
		expect(init.body).toBe(form);
		const h = init.headers as Headers;
		expect(h.has('Content-Type')).toBe(false); // the browser adds the multipart boundary
		expect(h.get('X-CSRF-Token')).toBe('tok9');
		expect(h.get('x-lk-scope-context')).toBe('fp-form');
	});
	it('postForm maps an error answer to the typed error, like every other call', async () => {
		fetchMock.mockResolvedValue(json(409, { error: 'conflict' }));
		await expect(api.postForm('/v1/x', new FormData(), z.unknown())).rejects.toBeInstanceOf(
			ConflictError
		);
	});
	it('getBlob returns the body as a Blob and carries the page context', async () => {
		pageData.data = { scopeContext: 'fp-dl' };
		fetchMock.mockResolvedValue(
			new Response('a,b\n1,2', { status: 200, headers: { 'content-type': 'text/csv' } })
		);
		const blob = await api.getBlob('/v1/crm/leads/export', { query: { q: 'x' } });
		expect(blob).toBeInstanceOf(Blob);
		expect(await blob.text()).toBe('a,b\n1,2');
		expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/crm/leads/export?q=x');
		expect((fetchMock.mock.calls[0][1] as RequestInit).headers as Headers).toSatisfy(
			(h: Headers) => h.get('x-lk-scope-context') === 'fp-dl' && h.get('X-CSRF-Token') === null
		);
	});
	it('getBlob maps a failed download to the typed error (a 409 scope_changed included)', async () => {
		fetchMock.mockResolvedValue(json(409, { error: 'scope_changed', message: 'x' }));
		await expect(api.getBlob('/v1/crm/leads/export')).rejects.toBeInstanceOf(ScopeChangedError);
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
