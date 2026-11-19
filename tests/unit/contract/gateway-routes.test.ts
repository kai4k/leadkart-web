import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findEndpoint, normalizePath } from '../../e2e/helpers/contract.ts';

/**
 * Every Go call the web makes (gateways under src/lib/features, server-side
 * goFetch / goAuthFetch calls in src/lib/server and src/routes) must hit a
 * route in leadkart-go api/openapi.yaml. Paths that do not are the remaining
 * contract debt: each is pinned here with the task that re-contracts it, so a
 * NEW unknown path fails the build and a fixed one cannot linger on the list.
 */
const KNOWN_DEBT: ReadonlyArray<{ pattern: RegExp; task: string }> = [
	{ pattern: /^\/api\/v1\/crm\//, task: 'Tasks 16-19 (leads)' },
	{
		pattern: /^\/api\/v1\/identity\/memberships$/,
		task: 'Task 19 (membership search has no Go route)'
	},
	{ pattern: /^\/api\/v1\/orders(\/|$)/, task: 'Tasks 20-23 (orders)' },
	{ pattern: /^\/api\/v1\/inventory\//, task: 'Tasks 24-26 (inventory)' },
	{ pattern: /^\/api\/v1\/tenants\/\{\}\/activity$/, task: 'Task 27 (activity)' },
	{ pattern: /^\/api\/v1\/platform\/persons\/\{\}\/activity$/, task: 'Task 27 (activity)' }
];

type Call = { file: string; line: number; method: string; path: string };

const VERB = /\b(?:api|apiLegacy)\.(get|post|put|patch|delete)\w*\s*(?:<[^>]*>)?\s*\(/g;
const GO_CALL = /\b(goFetch|goAuthFetch)\(/g;
const MULTIPART = /\b(?:postMultipart|multipartPost)\s*(?:<[^>]*>)?\s*\(/g;
const PATH_LITERAL = /(['`])(\/v1\/(?:(?!\1)[^\n])*)\1/g;

const lineOf = (src: string, idx: number) => src.slice(0, idx).split('\n').length;

/** Drop comments so doc examples are not scanned as calls. */
function stripComments(src: string): string {
	const blank = (m: string) => m.replace(/[^\n]/g, ' ');
	return src
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/(^|[^:'"`])\/\/[^\n]*/gm, (m: string, p: string) => p + blank(m.slice(p.length)));
}

/** The HTTP method of the call a path literal belongs to ('ANY' when it is built away from the call). */
function methodAt(src: string, idx: number): string {
	// The enclosing top-level declaration: back to the last column-0 line.
	let start = 0;
	for (const m of src
		.slice(0, idx)
		.matchAll(/\n(?=export |async function |function |const |let )/g))
		start = m.index!;
	const head = src.slice(start, idx);
	let verb: string | null = null;
	for (const m of head.matchAll(VERB)) verb = m[1].toUpperCase();
	let multipart = false;
	for (const _ of head.matchAll(MULTIPART)) multipart = true;
	if (multipart && !verb) return 'POST';
	const goCalls = [...head.matchAll(GO_CALL)];
	if (goCalls.length > 0 && !verb) {
		const last = goCalls[goCalls.length - 1];
		const tail = src.slice(start + last.index!, src.indexOf(');', idx) + 2);
		return (
			/method:\s*'(\w+)'/.exec(tail)?.[1] ?? (last[1] === 'goAuthFetch' ? 'POST' : 'GET')
		).toUpperCase();
	}
	return verb ?? 'ANY';
}

const routeFiles = [
	...globSync('src/lib/features/**/api.ts'),
	...globSync('src/lib/server/**/*.ts'),
	...globSync('src/routes/**/*.ts')
].filter((f) => !f.endsWith('.test.ts'));

const suffixes = new Set<string>();
for (const file of routeFiles) {
	for (const m of readFileSync(file, 'utf8').matchAll(/pathSuffix:\s*'(\/[^']+)'/g))
		suffixes.add(m[1]);
}

const calls: Call[] = [];
for (const file of routeFiles) {
	const src = stripComments(readFileSync(file, 'utf8'));
	for (const m of src.matchAll(PATH_LITERAL)) {
		const method = methodAt(src, m.index!);
		const base = { file: file.replaceAll('\\', '/'), line: lineOf(src, m.index!), method };
		// `${pathSuffix}` is a typed parameter whose literals live in the callers.
		if (m[2].includes('${pathSuffix}'))
			for (const s of suffixes) calls.push({ ...base, path: m[2].replace('${pathSuffix}', s) });
		else calls.push({ ...base, path: m[2] });
	}
}

const unknown = calls.filter((c) => !findEndpoint(c.method, `/api${c.path}`));
const debt = (c: Call) => KNOWN_DEBT.find((d) => d.pattern.test(normalizePath(`/api${c.path}`)));

describe('every web call targets a route in leadkart-go api/openapi.yaml', () => {
	it('finds the gateway and server-side calls', () => {
		expect(calls.length).toBeGreaterThan(40);
		expect(new Set(calls.map((c) => c.file)).size).toBeGreaterThan(10);
	});

	it('covers the gateway files, the server helpers and the server routes', () => {
		const files = new Set(calls.map((c) => c.file));
		expect(files.has('src/lib/features/users/api.ts')).toBe(true);
		expect(files.has('src/lib/server/capabilities.ts')).toBe(true);
		expect(files.has('src/routes/auth/login/+server.ts')).toBe(true);
		expect(files.has('src/routes/(app)/settings/tenant/_actions.ts')).toBe(true);
	});

	it('every unknown path is pinned to the task that re-contracts it', () => {
		const unpinned = unknown.filter((c) => !debt(c));
		expect(unpinned.map((c) => `${c.method} ${c.path} (${c.file}:${c.line})`)).toEqual([]);
	});

	it('no pinned debt entry is stale (every entry still matches an unknown path)', () => {
		const stale = KNOWN_DEBT.filter((d) => !unknown.some((c) => debt(c) === d));
		expect(stale.map((d) => `${d.pattern} -> ${d.task}`)).toEqual([]);
	});

	it.each(
		calls
			.filter((c) => !unknown.includes(c))
			.map((c) => [`${c.method} ${c.path} (${c.file}:${c.line})`, c] as const)
	)('%s', (_name, c) => {
		expect(findEndpoint(c.method, `/api${c.path}`)).toBeDefined();
	});
});
