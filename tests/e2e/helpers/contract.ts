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
	/^\/api\/v1\/auth\/me\/activity$/, // activity: Task 27
	/^\/api\/v1\/tenants\/[^/]+\/activity$/, // activity: Task 27
	/^\/api\/v1\/platform\/persons\/[^/]+\/activity$/, // activity: Task 27
	/^\/api\/v1\/platform\/persons$/ // operator people email lookup: Task 28
];

function segmentsMatch(a: string[], b: string[], prefix = false): boolean {
	if (prefix ? a.length > b.length : a.length !== b.length) return false;
	return a.every((s, i) => {
		if (b[i] === PARAM || s === PARAM) return s !== '';
		return prefix && i === a.length - 1 ? b[i].startsWith(s) : s === b[i];
	});
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

function successError(schema: z.ZodType, f: MockFixture): string | null {
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
	if (!opts.strict && UNVALIDATED_PATHS.some((re) => re.test(path))) return null;
	const candidates = matching(f.method, path, wildcard);
	if (candidates.length === 0)
		return `${f.method} ${f.path} is not a route in api/openapi.yaml (the web must not call it)`;
	if (f.status >= 200 && f.status < 300) {
		const errors = candidates.map((e) => successError(responseFor(e), f));
		return errors.includes(null) ? null : errors[0];
	}
	// A 3xx is not an answer Go gives (infrastructure in front of it can): the route must exist, the body is not Go's.
	if (f.status >= 300 && f.status < 400) return null;
	const r = ErrorResponse.safeParse(f.body);
	return r.success
		? null
		: `error fixture must be Go's ErrorResponse { error, message? }: ${z.prettifyError(r.error)}`;
}

export function assertFixtures(fixtures: readonly MockFixture[]): void {
	const problems = fixtures
		.map((f) => [f, validateFixture(f)] as const)
		.filter(([, e]) => e !== null)
		.map(([f, e]) => `- ${f.method} ${f.path} [${f.status}]: ${e}`);
	if (problems.length > 0)
		throw new Error(`Mock fixture(s) do not match the Go contract:\n${problems.join('\n')}`);
}
