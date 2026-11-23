/**
 * Contract guard for the e2e mock: a fixture may only be something the real
 * Go API could send.
 *
 * Fixtures are validated against Go's GENERATED schemas (src/lib/api/generated,
 * pinned to a leadkart-go commit by SOURCE.json), never against the web's own
 * relaxed schemas. The web's schemas then parse those Go-shaped bodies in e2e,
 * so a web schema that is stricter than Go fails loudly instead of hiding.
 *
 * Also the one place that knows how to look an endpoint up: the gateway route
 * scan (tests/unit/contract/gateway-routes.test.ts) uses `findEndpoint` too.
 */
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
	endpoints,
	ErrorResponse,
	type GeneratedEndpoint
} from '../../../src/lib/api/generated/openapi-zod.ts';
import type { MockFixture } from './mock.ts';

const PARAM = '{}';

/** `:id`, `{id}` and `${expr}` segments all become `{}`; the query string is dropped. */
export function normalizePath(path: string): string {
	return path
		.split('?')[0]
		.split('/')
		.map((s) => (/^:\w+$/.test(s) || /^\{[^}]+\}$/.test(s) || s.includes('${') ? PARAM : s))
		.join('/');
}

const isBodyless = (schema: z.ZodType) => schema.safeParse(undefined).success;

/**
 * Go spec bugs the web deliberately overrides. Add an entry only where the
 * spec is demonstrably wrong against Go's code, and cite the Go file that
 * proves it in `reason`.
 */
export const SPEC_OVERRIDES: ReadonlyArray<{
	method: string;
	/** Normalised template, e.g. `/api/v1/tenants/{}`. */
	path: string;
	response: z.ZodType;
	reason: string;
}> = [];

/**
 * Error statuses Go's CODE sends but its openapi.yaml does not document for the operation. The status
 * guard would refuse them; each entry says where the code sends it, so the Go spec can be fixed and
 * the entry deleted (a status the spec documents needs no entry).
 */
const SPEC_STATUS_GAPS: ReadonlyArray<{
	method: string;
	path: string;
	statuses: number[];
	reason: string;
}> = [
	{
		method: 'post',
		path: '/api/v1/users',
		statuses: [409],
		reason:
			'internal/identity/ports/users_http.go:378 answers 409 email_has_active_membership; the spec documents 201 / 403'
	},
	{
		method: 'get',
		path: '/api/v1/roles/{}',
		statuses: [404],
		reason:
			'internal/identity/ports/roles_http.go:40 answers 404 role_not_found; the spec documents 200 / 403'
	},
	{
		method: 'get',
		path: '/api/v1/platform/persons/{}',
		statuses: [404],
		reason:
			'internal/identity/ports/platform_http.go:120 answers 404 person_not_found; the spec documents 200 / 403'
	}
];

/**
 * Areas whose specs still register pre-Go fixtures. Each re-contract task
 * deletes its line; the last one leaves the list empty. The guard is on by
 * default: a fixture outside this list must match the Go contract.
 */
export const UNVALIDATED_PATHS: readonly RegExp[] = [
	/^\/api\/v1\/crm\//, // leads: Tasks 16-19
	/^\/api\/v1\/identity\/memberships$/, // membership search has no Go route: Task 19
	/^\/api\/v1\/orders(\/|$)/, // orders: Tasks 20-23
	/^\/api\/v1\/dispatch\//, // dispatch: Tasks 20-23
	/^\/api\/v1\/inventory\//, // inventory: Tasks 24-26
	/^\/api\/v1\/platform\/persons$/ // operator people email lookup: Task 28
];

/**
 * `a` is the web path, `b` Go's template. A parameter on the web side (a template expression) matches
 * ONLY a parameter on Go's side: `${id}` is not Go's literal `me`. A concrete segment matches a Go
 * parameter or the same literal; an empty segment matches nothing.
 */
function segmentsMatch(a: string[], b: string[], prefix = false): boolean {
	if (prefix ? a.length > b.length : a.length !== b.length) return false;
	return a.every((s, i) => {
		if (s === PARAM) return b[i] === PARAM;
		if (b[i] === PARAM) return s !== '';
		return prefix && i === a.length - 1 ? b[i].startsWith(s) : s === b[i];
	});
}

/**
 * The statuses Go documents per operation, read from the generated types
 * (`'/api/...': { post: { responses: { 201: ... } } }`; the generated zod map keeps no status).
 */
const DOCUMENTED_STATUSES: ReadonlyMap<string, readonly number[]> = (() => {
	const src = readFileSync(
		new URL('../../../src/lib/api/generated/openapi-types.ts', import.meta.url),
		'utf8'
	);
	const out = new Map<string, number[]>();
	let path = '';
	let method = '';
	let inResponses = false;
	for (const line of src.split(/\r?\n/)) {
		const p = /^\t'(\/api[^']*)': \{$/.exec(line);
		if (p) {
			path = normalizePath(p[1]);
			continue;
		}
		const m = /^\t\t(get|post|put|patch|delete): \{$/.exec(line);
		if (m) {
			method = m[1];
			inResponses = false;
			continue;
		}
		if (/^\t\t\tresponses: \{$/.test(line)) inResponses = true;
		else if (/^\t\t\t\S/.test(line)) inResponses = false;
		const code = inResponses ? /^\t\t\t\t(\d{3}): /.exec(line) : null;
		if (code && path && method) {
			const key = `${method} ${path}`;
			out.set(key, [...(out.get(key) ?? []), Number(code[1])]);
		}
	}
	return out;
})();

const documentedStatuses = (e: GeneratedEndpoint): readonly number[] =>
	DOCUMENTED_STATUSES.get(`${e.method} ${normalizePath(e.path)}`) ?? [];

const documentedSuccess = (e: GeneratedEndpoint): readonly number[] =>
	documentedStatuses(e).filter((c) => c >= 200 && c < 300);

/** Statuses that come from the platform in front of every route (auth, rate limiter, gateway), not from one operation. */
const PLATFORM_STATUSES: readonly number[] = [401, 429, 500, 502, 503, 504];

/** An error status Go does not document for this operation (and the platform does not add), or null. */
function errorStatusError(candidates: GeneratedEndpoint[], status: number): string | null {
	if (PLATFORM_STATUSES.includes(status)) return null;
	const gaps = candidates.flatMap(
		(e) =>
			SPEC_STATUS_GAPS.find((g) => g.method === e.method && g.path === normalizePath(e.path))
				?.statuses ?? []
	);
	const documented = [...candidates.flatMap(documentedStatuses), ...gaps];
	// Where the generated types say nothing about the operation, there is nothing to hold it to.
	if (documented.length === 0 || documented.includes(status)) return null;
	return `the Go route does not document a ${status} (it documents ${[...new Set(documented)].join(' / ')})`;
}

/** Endpoints whose method and path template match a concrete (or `{}`-templated) path. */
function matching(method: string, path: string, prefix = false): GeneratedEndpoint[] {
	const segs = normalizePath(path).split('/');
	const m = method.toLowerCase();
	// `ANY`: the scan could not tell the verb (a path built away from its call).
	return endpoints.filter(
		(e) =>
			(m === 'any' || e.method === m) &&
			segmentsMatch(segs, normalizePath(e.path).split('/'), prefix)
	);
}

/** The Go operation a request targets (`method` any case; `path` including `/api`), or undefined. */
export function findEndpoint(method: string, path: string): GeneratedEndpoint | undefined {
	return matching(method, path)[0];
}

function responseFor(e: GeneratedEndpoint): z.ZodType {
	const tpl = normalizePath(e.path);
	return (
		SPEC_OVERRIDES.find((o) => o.method === e.method && o.path === tpl)?.response ?? e.response
	);
}

function successError(e: GeneratedEndpoint, f: MockFixture): string | null {
	const schema = responseFor(e);
	const shape = bodyError(schema, f);
	if (shape) return shape;
	// The status itself, where the generated types document it (e.g. POST /roles answers 201, not 200).
	const documented = documentedSuccess(e);
	return documented.length > 0 && !documented.includes(f.status)
		? `the Go route documents ${documented.join(' / ')} but the fixture is ${f.status}`
		: null;
}

function bodyError(schema: z.ZodType, f: MockFixture): string | null {
	if (isBodyless(schema)) {
		if (f.status !== 204)
			return `the Go route answers 204 (no body) but the fixture is ${f.status}`;
		return f.body === undefined
			? null
			: 'the Go route answers 204 (no body) but the fixture has a body';
	}
	if (f.status === 204) return 'the Go route returns a body but the fixture is a 204';
	if (f.body === undefined) return 'the Go route returns a body but the fixture has none';
	const r = schema.safeParse(f.body);
	return r.success ? null : z.prettifyError(r.error);
}

/** null = the fixture is something Go could send. `strict` ignores UNVALIDATED_PATHS. */
export function validateFixture(f: MockFixture, opts: { strict?: boolean } = {}): string | null {
	const wildcard = f.path.endsWith('*');
	const path = wildcard ? f.path.slice(0, -1) : f.path;
	// A wildcard may reach any route under its prefix, so only a prefix exemption (one that still
	// matches with a segment appended) covers it; an exact-path exemption does not.
	const exempt = (re: RegExp) => re.test(wildcard ? `${path.replace(/\/$/, '')}/x` : path);
	if (!opts.strict && UNVALIDATED_PATHS.some(exempt)) return null;
	const candidates = matching(f.method, path, wildcard);
	if (candidates.length === 0)
		return `${f.method} ${f.path} is not a route in api/openapi.yaml (the web must not call it)`;
	if (f.status >= 200 && f.status < 300) {
		const errors = candidates.map((e) => successError(e, f));
		return errors.includes(null) ? null : errors[0];
	}
	// A 3xx is not an answer Go gives (infrastructure in front of it can): the route must exist, the body is not Go's.
	if (f.status >= 300 && f.status < 400) return null;
	const undocumented = errorStatusError(candidates, f.status);
	if (undocumented) return undocumented;
	const r = ErrorResponse.safeParse(f.body);
	if (!r.success)
		return `error fixture must be Go's ErrorResponse { error, message? }: ${z.prettifyError(r.error)}`;
	const code = (f.body as { error?: unknown }).error;
	return typeof code === 'string' && code.length > 0
		? null
		: "error fixture's `error` must be a non-empty string (Go always sends a code)";
}

export function assertFixtures(fixtures: readonly MockFixture[]): void {
	const problems = fixtures
		.map((f) => [f, validateFixture(f)] as const)
		.filter(([, e]) => e !== null)
		.map(([f, e]) => `- ${f.method} ${f.path} [${f.status}]: ${e}`);
	if (problems.length > 0)
		throw new Error(`Mock fixture(s) do not match the Go contract:\n${problems.join('\n')}`);
}
