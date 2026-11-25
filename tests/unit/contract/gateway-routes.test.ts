import { existsSync, globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TENANT_SECTIONS } from '#lib/features/tenant/server.ts';
import { findEndpoint, normalizePath } from '../../e2e/helpers/contract.ts';

/**
 * Every Go call the web makes (gateways under src/lib/features, server-side
 * goFetch / goAuthFetch calls in src/lib/server and src/routes) must hit a
 * route in leadkart-go api/openapi.yaml. Paths that do not are the remaining
 * contract debt: each is pinned here with the task that re-contracts it, so a
 * NEW unknown path fails the build and a fixed one cannot linger on the list.
 * ONE mechanism: a pin is a pattern that matches exactly the paths it names (per path, or one
 * per whole area where the area is not yet itemised: crm, inventory). A pin that ends in
 * `(\/|$)` would swallow every path under it, so none is allowed for an area itemised below.
 */
const KNOWN_DEBT: ReadonlyArray<{ pattern: RegExp; task: string }> = [
	{ pattern: /^\/api\/v1\/crm\//, task: 'Tasks 16-19 (leads)' },
	// Surfaced when a web `${id}` stopped matching Go's literal segments (round 6): Go's orders routes are
	// /orders/orders/{orderId}[/...] and /orders/quotations/{quotationId}[/...], so none of these exist.
	{ pattern: /^\/api\/v1\/orders\/\{\}\/revisions$/, task: 'Tasks 20-23 (orders: revisions)' },
	{ pattern: /^\/api\/v1\/orders\/\{\}\/payments$/, task: 'Tasks 20-23 (orders: payments)' },
	{ pattern: /^\/api\/v1\/orders\/\{\}\/invoice$/, task: 'Tasks 20-23 (orders: invoice)' },
	{
		pattern: /^\/api\/v1\/orders\/\{\}\/credit-notes$/,
		task: 'Tasks 20-23 (orders: credit notes)'
	},
	{
		pattern: /^\/api\/v1\/orders\/\{\}\/credit-notes\/\{\}$/,
		task: 'Tasks 20-23 (orders: credit note detail)'
	},
	// The rest of the web's orders surface (one pin per path: a NEW unknown orders path must fail here).
	{ pattern: /^\/api\/v1\/orders$/, task: 'Tasks 20-23 (orders: list, create)' },
	{ pattern: /^\/api\/v1\/orders\/\{\}$/, task: 'Tasks 20-23 (orders: detail, update, delete)' },
	{ pattern: /^\/api\/v1\/orders\/\{\}\/revise$/, task: 'Tasks 20-23 (orders: revise)' },
	{
		pattern: /^\/api\/v1\/orders\/\{\}\/approve-quotation$/,
		task: 'Tasks 20-23 (orders: approve quotation)'
	},
	{ pattern: /^\/api\/v1\/orders\/\{\}\/confirm$/, task: 'Tasks 20-23 (orders: confirm)' },
	{ pattern: /^\/api\/v1\/orders\/\{\}\/mark-packed$/, task: 'Tasks 20-23 (orders: pack)' },
	{
		pattern: /^\/api\/v1\/orders\/\{\}\/generate-invoice$/,
		task: 'Tasks 20-23 (orders: invoice)'
	},
	{ pattern: /^\/api\/v1\/orders\/\{\}\/dispatch$/, task: 'Tasks 20-23 (orders: dispatch)' },
	{
		pattern: /^\/api\/v1\/orders\/\{\}\/mark-delivered$/,
		task: 'Tasks 20-23 (orders: delivered)'
	},
	{ pattern: /^\/api\/v1\/orders\/\{\}\/complete$/, task: 'Tasks 20-23 (orders: complete)' },
	{ pattern: /^\/api\/v1\/orders\/\{\}\/cancel$/, task: 'Tasks 20-23 (orders: cancel)' },
	{ pattern: /^\/api\/v1\/orders\/bulk-action$/, task: 'Tasks 20-23 (orders: bulk action)' },
	// Inventory: only what Go does not serve. One pin per path (the products and batches CRUD routes are real; bulk
	// action and bulk upload are gone from the web, Go has neither).
	{
		pattern: /^\/api\/v1\/inventory\/batches\/\{\}\/write-off$/,
		task: 'Tasks 24-26 (inventory: write-off)'
	},
	{
		pattern: /^\/api\/v1\/inventory\/batches\/\{\}\/quarantine$/,
		task: 'Tasks 24-26 (inventory: quarantine)'
	},
	{
		pattern: /^\/api\/v1\/inventory\/products\/\{\}\/movements(\?.*)?$/,
		task: 'Tasks 24-26 (inventory: stock movements)'
	},
	{ pattern: /^\/api\/v1\/inventory\/categories$/, task: 'Tasks 24-26 (inventory: categories)' },
	{ pattern: /^\/api\/v1\/inventory\/types$/, task: 'Tasks 24-26 (inventory: types)' },
	{
		pattern: /^\/api\/v1\/inventory\/gst-defaults$/,
		task: 'Tasks 24-26 (inventory: GST defaults)'
	},
	{
		pattern: /^\/api\/v1\/inventory\/products\/\{\}\/computed-prices$/,
		task: 'Tasks 24-26 (inventory: computed prices)'
	}
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
	...globSync('src/lib/features/**/server.ts'),
	...globSync('src/lib/server/**/*.ts'),
	...globSync('src/routes/**/*.ts')
].filter((f) => !f.endsWith('.test.ts'));

// The tenant gateway builds `/v1/tenants/{id}/${section}`: every section is a real PATCH route.
const suffixes = new Set<string>(Object.keys(TENANT_SECTIONS).map((x) => `/${x}`));

const calls: Call[] = [];
for (const file of routeFiles) {
	const src = stripComments(readFileSync(file, 'utf8'));
	for (const m of src.matchAll(PATH_LITERAL)) {
		// A template-literal TYPE (`path: `/v1/${string}``) is a signature, not a call.
		if (m[2].includes('${string}')) continue;
		const method = methodAt(src, m.index!);
		const base = { file: file.replaceAll('\\', '/'), line: lineOf(src, m.index!), method };
		// `${pathSuffix}` is a typed parameter whose literals live in the callers.
		if (m[2].endsWith('/${section}'))
			for (const s of suffixes) calls.push({ ...base, path: m[2].replace('/${section}', s) });
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
		expect(files.has('src/routes/auth/confirm-email-change/+server.ts')).toBe(true);
		expect(files.has('src/lib/features/tenant/server.ts')).toBe(true);
	});

	it('the raw-echo BFF auth routes are gone (sign-in and reset are form actions)', () => {
		for (const route of ['login', 'request-password-reset', 'reset-password']) {
			expect(existsSync(`src/routes/auth/${route}/+server.ts`), route).toBe(false);
		}
		expect(existsSync('src/routes/auth/confirm-email-change/+server.ts')).toBe(true);
		expect(existsSync('src/routes/auth/logout/+server.ts')).toBe(true);
	});

	it('every unknown path is pinned to the task that re-contracts it', () => {
		const unpinned = unknown.filter((c) => !debt(c));
		expect(unpinned.map((c) => `${c.method} ${c.path} (${c.file}:${c.line})`)).toEqual([]);
	});

	it('no area catch-all pin sits beside per-path pins of the same area (it would pin nothing)', () => {
		const sources = KNOWN_DEBT.map((d) => d.pattern.source);
		const open = String.raw`(\/|$)`;
		const catchAlls = sources.filter((x) => x.endsWith(String.raw`\/`) || x.endsWith(open));
		for (const area of catchAlls) {
			const prefix = area.replace(open, '');
			const swallowed = sources.filter((x) => x !== area && x.startsWith(prefix));
			expect(swallowed, `${area} swallows the per-path pins`).toEqual([]);
		}
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
