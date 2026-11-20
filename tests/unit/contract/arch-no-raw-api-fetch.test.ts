import { describe, expect, it } from 'vitest';
import {
	ALLOWED_FILES,
	URL_ONLY_FILES,
	findViolations,
	isAllowed
} from '../../../scripts/arch/check-no-raw-api-fetch.mjs';

/** Self-test of the arch gate: fixtures, not the repository. One offender per bypass. */
const flagged = (src: string, rel = 'src/lib/x.ts') => findViolations(rel, src).length > 0;
const svelte = (script: string, markup = '') =>
	`<script lang="ts">\n${script}\n</script>\n${markup}`;

describe('check-no-raw-api-fetch: what it refuses', () => {
	it.each([
		['a direct fetch to an /api path', `await fetch('/api/v1/x', { method: 'POST' });`],
		['a template path', 'await fetch(`/api${path}`);'],
		['window.fetch', `await window.fetch("/api/operator/scope");`],
		['globalThis.fetch', `await globalThis.fetch('/api/v1/x');`],
		['self.fetch', `await self.fetch(url);`],
		["window['fetch']", `await window['fetch'](url);`],
		['an alias: const f = fetch; f(...)', `const f = fetch;\nawait f(url);`],
		['fetch passed as a value', `run(fetch);`],
		['a destructured fetch', `const { fetch } = globalThis;`],
		['a renamed destructured fetch', `const { fetch: f } = window;\nawait f(url);`],
		['a renamed destructured fetch of globalThis', `const { fetch: send } = globalThis;`],
		['a destructured fetch in a parameter', `function g({ fetch: f } = window) { return f; }`],
		['a destructured fetch named by a string', `const { 'fetch': f } = window;`],
		['a nested destructured fetch', `const { self: { fetch: f } } = globalThis;`],
		['a fetch to a path held in a constant', `const P = '/api/operator/scope';\nawait fetch(P);`],
		['a fetch to a non-/api path (any fetch counts)', `await fetch('/auth/logout');`],
		['a relative api/v1 path', `const u = 'api/v1/users';`],
		['an /api path built with location.origin', 'const u = `${location.origin}/api/v1/x`;'],
		['an /api path in another module (the path alone)', `export const BASE = '/api';`],
		['navigator.sendBeacon', `navigator.sendBeacon(url, body);`],
		['XMLHttpRequest', `const x = new XMLHttpRequest();`],
		['EventSource', `const es = new EventSource(url);`],
		['WebSocket', `const ws = new WebSocket(url);`]
	])('refuses %s', (_name, src) => {
		expect(flagged(src)).toBe(true);
	});

	it('refuses the same things in a plain .js file and in a svelte script', () => {
		expect(flagged(`const f = fetch;`, 'src/lib/x.js')).toBe(true);
		expect(flagged(svelte(`const f = fetch;`), 'src/lib/X.svelte')).toBe(true);
		expect(flagged(svelte(`const f = self.fetch;`), 'src/lib/X.svelte')).toBe(true);
	});

	it.each([
		['a form posting to /api', `<form method="POST" action="/api/v1/users"></form>`],
		['a link to /api', `<a href="/api/v1/leads/export">Export</a>`],
		['an img src under api/v1', `<img src="api/v1/avatar" alt="" />`],
		['a templated href', '<a href={`/api/v1/x/${id}`}>x</a>'],
		['a fetch in a markup expression', `{#await fetch(url)}...{/await}`]
	])('refuses %s in svelte markup', (_name, markup) => {
		expect(flagged(svelte('let id = 1;', markup), 'src/lib/X.svelte')).toBe(true);
	});
});

describe('check-no-raw-api-fetch: the shapes the review found past it', () => {
	it.each([
		['an HTTP client library: axios', `import axios from 'axios';`],
		['an HTTP client library: ky', `import ky from 'ky';`],
		['an HTTP client library: ofetch (named import)', `import { ofetch } from 'ofetch';`],
		['an HTTP client library: got', `import got from 'got';`],
		['an HTTP client library: undici', `import { request } from 'undici';`],
		['an HTTP client library: node-fetch', `import fetch2 from 'node-fetch';`],
		['an HTTP client library: cross-fetch', `import 'cross-fetch/polyfill';`],
		['an HTTP client library by subpath', `import x from 'axios/lib/core';`],
		['an HTTP client library with the node: prefix', `import { fetch as f } from 'node:undici';`],
		['an HTTP client library re-exported', `export { default } from 'axios';`],
		['an HTTP client library loaded dynamically', `const a = await import('axios');`],
		['an HTTP client library required', `const a = require('got');`],
		["the string 'fetch' as an object key", `const o = { 'fetch': 1 };`],
		["the string 'XMLHttpRequest' as a class property key", `class A { 'XMLHttpRequest' = 1; }`],
		["Reflect.get(window, 'fetch')", `const f = Reflect.get(window, 'fetch');`],
		["Reflect.get with 'XMLHttpRequest'", `const X = Reflect.get(globalThis, "XMLHttpRequest");`],
		[
			"Object.getOwnPropertyDescriptor(window, 'fetch')",
			`Object.getOwnPropertyDescriptor(window, 'fetch');`
		]
	])('refuses %s', (_name, src) => {
		expect(flagged(src)).toBe(true);
	});

	it.each([
		['a .mts file', 'src/lib/x.mts'],
		['a .cts file', 'src/lib/x.cts'],
		['a .cjs file', 'src/lib/x.cjs'],
		['a script under static/', 'static/sw-helper.js']
	])('reads %s as source', (_name, rel) => {
		expect(flagged(`const f = fetch;`, rel)).toBe(true);
	});

	it('reads a script block of a static html file', () => {
		expect(flagged(`<script>const f = fetch;</script>`, 'static/offline.html')).toBe(true);
	});

	it.each([
		[
			'a multi-line block',
			`{#await
	fetch(url)
}...{/await}`
		],
		['an @const with a fetch', `{@const r = fetch(url)}`],
		['a handler with sendBeacon', `<button onclick={() => navigator.sendBeacon(u, b)}>x</button>`],
		['a handler with XMLHttpRequest', `<button onclick={() => new XMLHttpRequest()}>x</button>`],
		['a handler with EventSource', `<button onclick={() => new EventSource(u)}>x</button>`],
		[
			'a multi-line handler',
			`<button
	onclick={async () => {
		const r = await fetch(u);
	}}
>x</button>`
		],
		['an each block with a fetch inside', `{#each items as i}{fetch(i)}{/each}`]
	])('refuses %s in svelte markup', (_name, markup) => {
		expect(
			flagged(
				svelte('let url = 1; let u = 1; let b = 1; let items = [];', markup),
				'src/lib/X.svelte'
			)
		).toBe(true);
	});

	it('does not mistake a style block or a plain markup brace for code', () => {
		expect(
			flagged(
				svelte('let a = 1;', `<style>.x { fetch: 1; } </style><p>{a}</p><p>{refetch()}</p>`),
				'src/lib/X.svelte'
			)
		).toBe(false);
	});

	it('the string "fetch" as a plain value is not a key', () => {
		expect(
			flagged(`const label = 'fetch';
const o = { a: 'XMLHttpRequest' };`)
		).toBe(false);
	});

	it('HTTP client libraries are refused even in a pinned file (the gate reports them there)', () => {
		expect(isAllowed('src/lib/server/go.ts')).toBe(true);
		expect(flagged(`import got from 'got';`, 'src/lib/server/go.ts')).toBe(true);
	});
});

describe('check-no-raw-api-fetch: a URL-only file keeps to its exact URLs', () => {
	const file = 'src/lib/features/auth/api.ts';
	const urls = URL_ONLY_FILES[file].urls;

	it('accepts the shapes the file really uses', () => {
		expect(
			flagged(
				`export async function logout() { await fetch('/auth/logout', { method: 'POST' }); }
export async function confirm(token: string, fetchFn: typeof fetch = fetch) {
	return fetchFn('/auth/confirm-email-change', { method: 'POST', body: token });
}`,
				file
			)
		).toBe(false);
	});

	it.each([
		['a fetch to another /auth URL', `await fetch('/auth/other');`],
		['a fetch to a URL held in a variable', `const u = '/auth/logout'; await fetch(u);`],
		['a fetch to an /api URL', `await fetch('/api/v1/x');`],
		['fetchFn called with another URL', `await fetchFn('/auth/other');`],
		['fetchFn called with a variable', `await fetchFn(url);`],
		['an alias of fetch', `const f = fetch;`],
		['fetch passed as a value', `run(fetch);`],
		['fetch as a default of another parameter', `function a(go: typeof fetch = fetch) {}`]
	])('refuses %s', (_name, src) => {
		expect(flagged(src, file)).toBe(true);
	});

	it('the list is exact, each file with a reason, and is not also fully pinned', () => {
		for (const [f, v] of Object.entries(URL_ONLY_FILES)) {
			expect(v.reason.length).toBeGreaterThan(10);
			expect(v.urls.length).toBeGreaterThan(0);
			expect(v.urls.every((u) => u.startsWith('/auth/'))).toBe(true);
			expect(isAllowed(f)).toBe(false);
		}
		expect(urls).toContain('/auth/logout');
	});
});

describe('check-no-raw-api-fetch: what it leaves alone', () => {
	it('comments never count', () => {
		expect(flagged(`// await fetch('/api/v1/x')\n/* fetch('/api/y') */`)).toBe(false);
		expect(flagged(svelte('', '<!-- <a href="/api/x">x</a> -->'), 'src/lib/X.svelte')).toBe(false);
	});

	it('a method named fetch (event.fetch, refetch) is not the global fetch', () => {
		expect(flagged(`await event.fetch(a);\nquery.refetch();\nconst o = { fetch: 1 };`)).toBe(false);
	});

	it('a path that merely contains the word api, and the API client calls', () => {
		expect(flagged(`const docs = '/apiary';\nawait api.get('/leads');`)).toBe(false);
	});

	it('reports the line', () => {
		expect(findViolations('src/lib/x.ts', `a;\nawait fetch(u);`)[0]!.line).toBe(2);
	});
});

describe('check-no-raw-api-fetch: the pinned files', () => {
	it('are exact files with a reason each, never directories', () => {
		for (const [file, reason] of Object.entries(ALLOWED_FILES)) {
			expect(file.endsWith('/')).toBe(false);
			expect(reason.length).toBeGreaterThan(10);
		}
		expect(isAllowed('src/lib/api/client.ts')).toBe(true);
		expect(isAllowed('src/lib/api/operator-scope.ts')).toBe(false);
		expect(isAllowed('src/routes/api/other/+server.ts')).toBe(false);
		expect(isAllowed('src/lib/server/other.ts')).toBe(false);
		expect(isAllowed('src/lib/features/leads/api.ts')).toBe(false);
		expect(isAllowed('src/service-worker/other.ts')).toBe(false);
	});
});
