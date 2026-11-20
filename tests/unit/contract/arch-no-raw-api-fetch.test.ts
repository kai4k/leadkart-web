import { describe, expect, it } from 'vitest';
import {
	ALLOWED_FILES,
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
