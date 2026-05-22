/**
 * Mock Go API server for Playwright e2e.
 *
 * After the BFF migration, the browser talks to SvelteKit, which talks
 * server-to-server to Go. Playwright's page.route() can't intercept
 * BFF→Go traffic. This is a real HTTP server at GO_API_URL that the BFF
 * actually calls; tests push fixtures into it via the control plane.
 *
 * Control plane (test-only):
 *   POST /_mock/register      { method, path, status, body }   register one
 *   POST /_mock/registerMany  [...]                            batch register
 *   POST /_mock/reset                                          clear all
 *   GET  /_mock/calls                                          inspect received
 *
 * Path matching: exact, then longest-prefix-with-trailing-* wildcard.
 * Per-test isolation: every test calls /_mock/reset in beforeEach.
 */

import http from 'node:http';
import { URL } from 'node:url';

/** @type {Array<{method:string,path:string,status:number,body?:unknown,headers?:Record<string,string>}>} */
const fixtures = [];
/** @type {Array<{method:string,path:string,body:string,at:number}>} */
const calls = [];

function findFixture(method, pathname) {
	const exact = fixtures.find((f) => f.method === method && f.path === pathname);
	if (exact) return exact;
	const wildcards = fixtures
		.filter((f) => f.method === method && f.path.endsWith('*'))
		.map((f) => ({ f, prefix: f.path.slice(0, -1) }))
		.filter(({ prefix }) => pathname.startsWith(prefix))
		.sort((a, b) => b.prefix.length - a.prefix.length);
	return wildcards[0]?.f ?? null;
}

function readBody(req) {
	return new Promise((resolve) => {
		const chunks = [];
		req.on('data', (c) => chunks.push(c));
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
	});
}

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
	const pathname = url.pathname;
	const method = req.method ?? 'GET';

	if (pathname.startsWith('/_mock/')) {
		const body = await readBody(req);
		if (pathname === '/_mock/reset' && method === 'POST') {
			fixtures.length = 0;
			calls.length = 0;
			res.writeHead(204).end();
			return;
		}
		if (pathname === '/_mock/register' && method === 'POST') {
			fixtures.push(JSON.parse(body));
			res.writeHead(204).end();
			return;
		}
		if (pathname === '/_mock/registerMany' && method === 'POST') {
			fixtures.push(...JSON.parse(body));
			res.writeHead(204).end();
			return;
		}
		if (pathname === '/_mock/calls' && method === 'GET') {
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify(calls));
			return;
		}
		res.writeHead(404).end();
		return;
	}

	const body = await readBody(req);
	calls.push({ method, path: pathname, body, at: Date.now() });

	const fixture = findFixture(method, pathname);
	if (!fixture) {
		res.writeHead(404, { 'content-type': 'application/json' });
		res.end(JSON.stringify({ error: 'mock_not_registered', path: pathname, method }));
		return;
	}

	const headers = { 'content-type': 'application/json', ...(fixture.headers ?? {}) };
	res.writeHead(fixture.status, headers);
	res.end(fixture.body !== undefined ? JSON.stringify(fixture.body) : '');
});

const port = Number(process.env.MOCK_PORT ?? 9999);
server.listen(port, () => {
	// eslint-disable-next-line no-console
	console.log(`[mock-go] listening on http://localhost:${port}`);
});
