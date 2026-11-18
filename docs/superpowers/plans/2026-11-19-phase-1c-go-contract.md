# Phase 1c: re-contract the web to the Go API, permission model, shared pieces, BFF + CI follow-ups. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make every web API call, schema, status code and permission check match the real leadkart-go API (`api/openapi.yaml` + `internal/*/ports`). Hide every feature that has no Go endpoint. Add guards that make contract drift fail a test. Close the remaining Phase 1c BFF, data-layer and CI items.

**Architecture:** Go's OpenAPI spec is regenerated into Zod schemas plus a runtime endpoint map (`endpoints`). Feature schemas are derived from those generated schemas (`.extend` / `.pick`). The new API client separates void calls (`api.post`) from body-parsing calls (`api.postJson(path, body, schema)`). Every mutation hook is built from one `createResourceMutation` that invalidates the detail and list keys. Three guards stop drift: a type check (derived schemas), a unit test (every gateway path + method exists in `endpoints`), and an e2e helper (every mock fixture must validate against the generated schema for its path, method and status). Permissions, navigation and server guards all read one pure config, `src/lib/config/nav.ts`.

**Tech stack:** SvelteKit 3.3 (adapter-node 6), Svelte 5 runes, TypeScript 6, Zod 4, TanStack svelte-query 6, Tailwind 4, bits-ui/shadcn primitives under `lib/components/ui`, Vitest 4, Playwright, openapi-typescript 7, openapi-zod-client 1.18.

**Inputs:**

- `docs/contract-matrix-web-vs-go.md` (rows such as L1, O2, I6 and E5 are cited by id)
- `docs/backend-checklist-leadkart-go.md` (cited as "checklist #n")
- `docs/superpowers/plans/2026-11-18-phase-1c-worklist.md` (cited as "worklist #n")
- `docs/superpowers/specs/2026-11-18-reuse-catalogue.md` (cited as "catalogue #n")

## Global constraints

- **Repo and branch:** `D:\Development\leadkart-web`, branch `feat/kit3-hardening`. No worktrees.
- **Concurrent work:** another engineer may be changing `src/lib/server/**`, `src/hooks.server.ts`, `src/lib/api/query-client.ts`, `src/routes/(app)/+layout.*` and `src/lib/server/guards.ts`. Code against their exported names and behaviour, never line numbers. Before editing any of these files, run `git log -3 -- <file>` and re-read it.
- **Imports:** new code uses explicit `.ts` and `#lib` (`import { api } from '#lib/api/client.ts'`). Cross-feature imports go only through the feature barrel (`#lib/features/<x>/index.ts`), or through a feature's `schemas.ts` / `types.ts` (allowed by `.dependency-cruiser.cjs` `no-cross-feature-imports`). The `$ui`, `$features`, `$api`, `$form`, `$icons` and `$layouts` aliases stay where code is untouched.
- **Server code never imports a `.svelte` file** or a barrel that re-exports components. This is why `nav.ts` has no icons (Task 11).
- **Reuse first (owner priority 1):** before writing anything, look for the existing helper or component in this plan or the reuse catalogue. A second similar occurrence must be extracted. Never copy a helper.
- **Go is the source of truth:** read the Go DTO (`internal/<module>/ports/dto.go`) and the route registration (`ports/http.go`) before writing a schema or gateway. If Go has no route, the web feature is hidden with a `TODO(backend): <what> — needs <METHOD path> (backend-checklist #<n>)` comment where its entry point used to be. No fake data and no calls to missing routes.
- **Design tokens only.** Desktop-first. Domiex look through the existing tokens. One library per concern.
- **Gates before every commit, run one at a time:** `npm run check`, `npm run lint`, `npm run lint:deps`, `npm run lint:dead`, `npm run arch:check`, `npm run test`, `npm run build`. From Task 1 on, also `npm run openapi:check`.
- **Vitest:** run from PowerShell with cwd `D:\Development\leadkart-web` (uppercase D). From Git Bash every suite fails with an environment artifact.
- **Playwright:** run only as `CI=1 npx playwright test <files> --project=chromium --retries=0`. Ports 4173 and 9999 must be free before and after: check with `Get-NetTCPConnection -LocalPort 4173,9999 -ErrorAction SilentlyContinue`.
- **Commits:** never `--no-verify`. Messages end with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- **Error envelope:** BFF JSON errors keep the shape `{ error, message }` (`src/lib/server/http.ts` `jsonError`).
- **Rule 11 is dead:** Go mutations return 204, or 200/201 with an id-only body (checklist #9). Gateways return `void` unless the caller needs the id. Query hooks invalidate; components never `await mutate(); await refetch()`.

## Task order and diff budget

| #   | Task                                                                                  | Bullet  |
| --- | ------------------------------------------------------------------------------------- | ------- |
| 1   | OpenAPI codegen keeps the endpoint map; `openapi:check`                               | A       |
| 2   | Error contract + typed errors (`SchemaError`, `RateLimitError`, correlation id)       | A, H    |
| 3   | API client v2 (void vs JSON, query, timeout, signal) + `apiLegacy`                    | A, H    |
| 4   | `createResourceMutation`, cursor pagination helpers, infinite-list signal, `setMany`  | A, H    |
| 5   | Identity gateways on client v2 (auth, users, roles, permission requests) + 204 fixes  | A, F, H |
| 6   | Identity gateways on client v2 (tenant, operator tenants/impersonation/stats, search) | A, F, H |
| 7   | Schemas derived from generated Zod; optional capabilities fields; tenant status enum  | A       |
| 8   | `goAuthFetch` + Go error codes in server actions + one `GoErrorBody`                  | A, I    |
| 9   | Cookie lifetimes (10 min / 14 days)                                                   | A       |
| 10  | Contract guards: fixture validator, gateway route scan, spec-valid identity fixtures  | A       |
| 11  | Permission semantics + single nav config (sidebar, route titles, command palette)     | B       |
| 12  | Server route guards (any-of), tenant settings actions, identity button gating         | B       |
| 13  | `utils/format.ts` + `utils/status.ts`                                                 | G       |
| 14  | `describeApiError` + `QueryState` + `DescriptionList`                                 | G       |
| 15  | `TextareaField`, `ReasonConfirmDialog`, `FormDialog`, `FormSheet`                     | G       |
| 16  | Leads 1/4: delete features with no Go route                                           | C       |
| 17  | Leads 2/4: data layer on Go `LeadDto` + mechanical component update                   | C       |
| 18  | Leads 3/4: behaviours (assign, reminders, lose/convert, kanban rules, filters)        | C       |
| 19  | Leads 4/4: e2e rewrite + validation on for `/crm/`                                    | C       |
| 20  | Orders 1/4: delete features with no Go route                                          | D       |
| 21  | Orders 2/4: `dispatch` feature + orders data layer + order detail on Go DTO           | D       |
| 22  | Orders 3/4: quotation detail, create from lead, line-items editor                     | D       |
| 23  | Orders 4/4: e2e rewrite + validation on for `/orders`, `/dispatch/`                   | D       |
| 24  | Inventory 1/3: delete features with no Go route                                       | E       |
| 25  | Inventory 2/3: data layer + UI on Go product/batch/movement DTOs                      | E       |
| 26  | Inventory 3/3: e2e rewrite + validation on for `/inventory/`                          | E       |
| 27  | Activity timelines (tenant audit events, my activity; person activity hidden)         | F       |
| 28  | Operator persons email lookup + scope tabs feature flag                               | F       |
| 29  | Dashboards on real endpoints (tasks, notifications, platform stats)                   | F       |
| 30  | Retire `apiLegacy`; unvalidated list must be empty                                    | A       |
| 31  | BFF: client IP + User-Agent forwarding, dead `/auth/*` routes, dedupe                 | I       |
| 32  | CI hardening                                                                          | J       |
| 33  | `CLAUDE.md` rewrite                                                                   | J       |

Tasks 16–19, 20–23 and 24–26 form three series. Each commit compiles and passes the local gates, and each commit updates the e2e scenarios it affects. Push each series together.

---

### Task 1: OpenAPI codegen keeps the endpoint map; `openapi:check`

**Files**

- Create: `scripts/openapi-codegen.mjs`
- Modify:
  - `scripts/strip-zodios.mjs` (keep `endpoints` instead of deleting it)
  - `package.json` scripts
  - `src/lib/api/generated/index.ts`
- Regenerate: `src/lib/api/generated/openapi-types.ts`, `src/lib/api/generated/openapi-zod.ts`
- Test: `tests/unit/api/generated-endpoints.test.ts`

**Interfaces**

- Produces from `#lib/api/generated/index.ts`: every component schema by name (`CrmLeadDto`, `OrderDto`, `ProductDto`, `ErrorResponse`, …), `endpoints: readonly GeneratedEndpoint[]`, and `type GeneratedEndpoint`.
- Produces the env var `LEADKART_OPENAPI_SPEC` (default `../leadkart-go/api/openapi.yaml`).
- Known spec bug (checklist #12, `api/openapi.yaml:3358`): `TenantDto.status` lists `marked_for_deletion, hard_deleted`. The Go code (`internal/identity/domain/tenant/status.go:26-70`) uses `pending`, `active`, `suspended`, `pending_deletion`, `deleted`. **The web uses the code's values** (Task 7 overrides the schema; Task 10 registers the override in the fixture validator). The generated file stays byte-identical to codegen output.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/generated-endpoints.test.ts
import { describe, expect, it } from 'vitest';
import { endpoints } from '#lib/api/generated/index.ts';

const find = (method: string, path: string) =>
	endpoints.find((e) => e.method === method && e.path === path);

describe('generated endpoint map', () => {
	it('contains the CRM, orders and inventory routes from api/openapi.yaml', () => {
		expect(find('get', '/api/v1/crm/leads/:leadId')).toBeDefined();
		expect(find('get', '/api/v1/orders/orders/:orderId')).toBeDefined();
		expect(find('get', '/api/v1/inventory/batches/:batchId/movements')).toBeDefined();
	});
	it('marks 204 routes as bodyless', () => {
		const stage = find('post', '/api/v1/crm/leads/:leadId/stage');
		expect(stage?.response.safeParse(undefined).success).toBe(true);
	});
	it('keeps body schemas for 200 routes', () => {
		const list = find('get', '/api/v1/users');
		expect(list?.response.safeParse({ users: [], has_more: false }).success).toBe(true);
		expect(list?.response.safeParse(undefined).success).toBe(false);
	});
});
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/api/generated-endpoints.test.ts`. It fails because `endpoints` is not exported.

- [ ] **Step 3: Implement**

`scripts/openapi-codegen.mjs`:

```js
/**
 * Regenerates src/lib/api/generated/* from the Go OpenAPI spec (the source of truth).
 * Spec path: $LEADKART_OPENAPI_SPEC, default ../leadkart-go/api/openapi.yaml.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const spec = resolve(process.env.LEADKART_OPENAPI_SPEC ?? '../leadkart-go/api/openapi.yaml');
if (!existsSync(spec)) {
	console.error(`[openapi] spec not found at ${spec}; set LEADKART_OPENAPI_SPEC`);
	process.exit(1);
}
const OUT = 'src/lib/api/generated';
const run = (cmd, args) =>
	execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });

run('npx', ['openapi-typescript', spec, '-o', `${OUT}/openapi-types.ts`]);
run('npx', ['openapi-zod-client', spec, '-o', `${OUT}/openapi-zod.ts`, '--export-schemas']);
run('node', ['scripts/strip-zodios.mjs', `${OUT}/openapi-zod.ts`]);
run('npx', ['prettier', '--write', OUT]);
```

`scripts/strip-zodios.mjs` keeps everything up to `endpointsStart`, then replaces the `makeApi([...])` call and everything after it with:

```js
const endpointsEnd = raw.indexOf('\n]);', endpointsStart);
if (endpointsEnd === -1) {
	console.error('Expected the makeApi([...]) block to end with `]);`');
	process.exit(1);
}
const arrayBody = raw.slice(
	endpointsStart + '\nconst endpoints = makeApi('.length,
	endpointsEnd + '\n]'.length
);
const endpointsBlock = `
/** One operation in api/openapi.yaml. \`path\` uses \`:param\` segments; \`response\` is the main 2xx schema (z.void() for 204). */
export interface GeneratedEndpoint {
	readonly method: 'get' | 'post' | 'put' | 'patch' | 'delete';
	readonly path: string;
	readonly response: z.ZodType;
	readonly [key: string]: unknown;
}

export const endpoints: readonly GeneratedEndpoint[] = ${arrayBody};
`;
// The cleaned file becomes the header + `body` + endpointsBlock (header text unchanged).
```

`src/lib/api/generated/index.ts`: keep `export * from './openapi-zod';` (it now includes `endpoints`) and add `export type { GeneratedEndpoint } from './openapi-zod';`.

`package.json` scripts: delete `openapi:types` and `openapi:zod`, then set:

```json
"openapi:codegen": "node scripts/openapi-codegen.mjs",
"openapi:check": "node scripts/openapi-codegen.mjs && git diff --exit-code -- src/lib/api/generated/"
```

Run `npm run openapi:codegen`.

If the generator does not emit `z.void()` for no-content responses, keep the test's check `response.safeParse(undefined).success`. Every consumer in this plan uses that same predicate (`isBodyless`, Task 10).

- [ ] **Step 4:** Run the test; it passes. Then run `npm run openapi:check` (expect exit 0) and the gate set.
- [ ] **Step 5:** Commit `chore(openapi): regenerate from leadkart-go, keep the endpoint map, add openapi:check`.

---

### Task 2: Error contract and typed errors

**Files**

- Modify:
  - `src/lib/api/errors.ts` (rewrite the wire-body section, `fromResponse`, `ValidationError`, `transport`; add `SchemaError`, `RateLimitError`)
  - `src/lib/hooks/use-form.svelte.ts` (banner fallback; `reset(next?)`)
  - `src/lib/server/proxy.ts` (forward `x-correlation-id`)
- Tests: `tests/unit/api/errors.test.ts` (rewrite the fromResponse cases), `tests/unit/features/use-form.test.ts`, `tests/unit/server/proxy.test.ts`

**Interfaces (produces)**

- `interface ApiErrorBody { error?; message?; detail?; title?; type?; status?; errors?: Record<string, readonly string[] | undefined> }`
- `flattenFieldErrors(errors?): Record<string, string>`
- `parseRetryAfter(value: string | null): number | undefined`
- `CORRELATION_ID_HEADER = 'x-correlation-id'`, `SCHEMA_MISMATCH_CODE = 'schema_mismatch'`
- `class ValidationError { fields: Record<string, string>; detail?: string; hasFieldErrors: boolean }`, constructor `(fields, status: 400 | 422, detail?, traceId?)`
- `class SchemaError extends ApiError { endpoint: string; issues: readonly SchemaIssue[] }`, `interface SchemaIssue { path: string; message: string }`
- `class RateLimitError extends ApiError { retryAfterSeconds?: number }` (status 429)
- `ApiError.transport(cause)`: `TimeoutError` only for `DOMException` named `TimeoutError`; everything else becomes `NetworkError`. Caller aborts are rethrown by the client (Task 3), never mapped.
- `useForm(...).reset(next?: z.input<S>)`
- Removed: `LegacyApiErrorBody`, `ProblemDetails` (no other importers), reading of `code`, `fields`, `trace_id`.

- [ ] **Step 1: Write the failing tests** (add to `tests/unit/api/errors.test.ts`; delete the old "RFC 9457 ProblemDetails mapping" cases that read `code`/`fields`):

```ts
const res = (status: number, headers: Record<string, string> = {}) =>
	new Response(null, { status, headers });

describe('ApiError.fromResponse — Go and BFF envelopes', () => {
	it('reads the Go code from `error`, text from message then detail', () => {
		const err = ApiError.fromResponse(res(409), {
			error: 'lead_terminal',
			message: '',
			detail: 'lead is closed'
		});
		expect(err).toBeInstanceOf(ConflictError);
		expect(err.code).toBe('lead_terminal');
		expect(err.message).toBe('lead is closed');
	});
	it('maps Go `errors` (string arrays) to first-message fields and keeps the detail', () => {
		const err = ApiError.fromResponse(res(422), {
			error: 'validation_failed',
			detail: 'One or more fields are invalid',
			errors: { new_password: ['too short', 'no digit'], email: [] }
		}) as ValidationError;
		expect(err.fields).toEqual({ new_password: 'too short' });
		expect(err.detail).toBe('One or more fields are invalid');
		expect(err.message).toBe('One or more fields are invalid');
		expect(err.hasFieldErrors).toBe(true);
	});
	it('keeps the text of a 400 without field errors', () => {
		const err = ApiError.fromResponse(res(400), {
			error: 'invalid_email',
			message: 'mail: no angle-addr'
		}) as ValidationError;
		expect(err.hasFieldErrors).toBe(false);
		expect(err.message).toBe('mail: no angle-addr');
		expect(err.code).toBe('invalid_email');
	});
	it('maps the BFF envelope { error, message }', () => {
		const err = ApiError.fromResponse(res(409), {
			error: 'scope_invalid',
			message: 'Operator scope expired'
		});
		expect(err).toBeInstanceOf(ScopeInvalidError);
	});
	it('maps 429 to RateLimitError with Retry-After seconds', () => {
		const err = ApiError.fromResponse(res(429, { 'retry-after': '30' }), {
			error: 'rate_limited'
		}) as RateLimitError;
		expect(err).toBeInstanceOf(RateLimitError);
		expect(err.retryAfterSeconds).toBe(30);
	});
	it('takes the trace id from X-Correlation-ID', () => {
		const err = ApiError.fromResponse(res(500, { 'x-correlation-id': 'c-1' }), {
			error: 'internal_error'
		});
		expect(err.traceId).toBe('c-1');
	});
	it('maps a TimeoutError DOMException to TimeoutError and anything else to NetworkError', () => {
		expect(ApiError.transport(new DOMException('t', 'TimeoutError'))).toBeInstanceOf(TimeoutError);
		expect(ApiError.transport(new TypeError('Failed to fetch'))).toBeInstanceOf(NetworkError);
	});
});

describe('SchemaError', () => {
	it('is an ApiError with a user message and the issues', () => {
		const err = new SchemaError('GET /v1/users', [
			{ path: 'users.0.email', message: 'Invalid email' }
		]);
		expect(err).toBeInstanceOf(ApiError);
		expect(err.code).toBe('schema_mismatch');
		expect(err.issues).toHaveLength(1);
		expect(err.message).toMatch(/refresh/i);
	});
});
```

Add to `tests/unit/features/use-form.test.ts`:

```ts
it('shows a ValidationError without field errors as the banner', async () => {
	const form = useForm(z.object({ email: z.string() }), { email: 'x' });
	await form.submit(new Event('submit') as SubmitEvent, async () => {
		throw new ValidationError({}, 400, 'mail: missing @');
	});
	expect(form.bannerError).toBe('mail: missing @');
	expect(form.errors).toEqual({});
});
```

Change the existing proxy header test to expect `x-correlation-id` to be forwarded.

- [ ] **Step 2:** Run the three suites; they fail.

- [ ] **Step 3: Implement `src/lib/api/errors.ts`** (complete replacement of the wire-body section, base class and subclasses; keep `isApiError` and `ScopeInvalidError`):

```ts
/**
 * Typed API errors. Two JSON envelopes reach the browser:
 *   Go (relayed by the BFF proxy): { type?, title?, status?, detail?, error: <code>, message?, errors?: { field: string[] } }
 *     (identity/ports/http.go writeError; crm|orders|inventory|dispatch errorResponse). `message`/`detail`
 *     are often empty (enumeration safety). Field errors use `errors`.
 *   BFF (lib/server/http.ts jsonError): { error: <code>, message }.
 * Go never sends `code`, `fields` or `trace_id`; the correlation id is the X-Correlation-ID header.
 */
export interface ApiErrorBody {
	error?: string;
	message?: string;
	detail?: string;
	title?: string;
	type?: string;
	status?: number;
	errors?: Record<string, readonly string[] | undefined>;
}

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const SESSION_EXPIRED_CODE = 'session_expired';
export const SCOPE_INVALID_CODE = 'scope_invalid';
export const SCHEMA_MISMATCH_CODE = 'schema_mismatch';

function firstText(...values: Array<string | undefined>): string | undefined {
	for (const v of values) if (typeof v === 'string' && v.trim() !== '') return v.trim();
	return undefined;
}

export function flattenFieldErrors(errors: ApiErrorBody['errors']): Record<string, string> {
	const out: Record<string, string> = {};
	if (!errors) return out;
	for (const [field, messages] of Object.entries(errors)) {
		const first = messages?.find((m) => m.trim() !== '');
		if (first) out[field] = first;
	}
	return out;
}

export function parseRetryAfter(value: string | null): number | undefined {
	if (!value) return undefined;
	const seconds = Number(value);
	if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
	const at = Date.parse(value);
	return Number.isNaN(at) ? undefined : Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

export class ApiError extends Error {
	readonly status: number | undefined;
	readonly traceId: string | undefined;
	code: string | undefined;

	constructor(status?: number, traceId?: string, code?: string) {
		super('An unexpected error occurred.');
		this.name = 'ApiError';
		this.status = status;
		this.traceId = traceId;
		this.code = code;
	}

	static fromResponse(response: Response, body: ApiErrorBody | null): ApiError {
		const code = firstText(body?.error);
		const text = firstText(body?.message, body?.detail);
		const traceId = response.headers.get(CORRELATION_ID_HEADER) ?? undefined;
		let err: ApiError;
		switch (response.status) {
			case 400:
			case 422:
				err = new ValidationError(flattenFieldErrors(body?.errors), response.status, text, traceId);
				break;
			case 401:
				err = new AuthError(401, traceId);
				break;
			case 403:
				err = new AuthError(403, traceId);
				break;
			case 404:
				err = new NotFoundError(response.url || 'unknown resource', traceId);
				break;
			case 409:
				err =
					code === SCOPE_INVALID_CODE
						? new ScopeInvalidError(
								text ?? 'Operator scope expired — select the tenant again',
								traceId
							)
						: new ConflictError(
								text ?? 'This conflicts with the current state. Refresh and try again.',
								traceId
							);
				break;
			case 429:
				err = new RateLimitError(parseRetryAfter(response.headers.get('retry-after')), traceId);
				break;
			default:
				if (response.status >= 500) {
					err = new ServerError(response.status, body, traceId);
				} else {
					err = new ApiError(response.status, traceId);
					err.message = text ?? firstText(body?.title) ?? (response.statusText || 'Request failed');
				}
		}
		if (code) err.code = code;
		return err;
	}

	/** fetch() threw. Caller aborts never get here (the client rethrows them). */
	static transport(cause: unknown): NetworkError | TimeoutError {
		if (cause instanceof DOMException && cause.name === 'TimeoutError') return new TimeoutError();
		return new NetworkError(cause);
	}

	static refreshFailed(): AuthError {
		const err = new AuthError(401);
		err.message = 'Session expired. Please sign in again.';
		return err;
	}
}

export class ValidationError extends ApiError {
	declare readonly status: 400 | 422;
	readonly fields: Record<string, string>;
	readonly detail: string | undefined;
	constructor(
		fields: Record<string, string>,
		status: 400 | 422,
		detail?: string,
		traceId?: string
	) {
		super(status, traceId);
		this.name = 'ValidationError';
		this.fields = fields;
		this.detail = detail;
		this.message =
			detail ?? Object.values(fields)[0] ?? 'Some details are not valid. Check them and try again.';
	}
	get hasFieldErrors(): boolean {
		return Object.keys(this.fields).length > 0;
	}
}

export interface SchemaIssue {
	path: string;
	message: string;
}

/** The response did not match the schema the web derives from the Go spec. */
export class SchemaError extends ApiError {
	readonly endpoint: string;
	readonly issues: readonly SchemaIssue[];
	constructor(endpoint: string, issues: readonly SchemaIssue[]) {
		super(undefined, undefined, SCHEMA_MISMATCH_CODE);
		this.name = 'SchemaError';
		this.endpoint = endpoint;
		this.issues = issues;
		this.message =
			'The server sent data this page does not understand. Refresh the page; if it keeps happening, contact support.';
	}
}

export class RateLimitError extends ApiError {
	declare readonly status: 429;
	readonly retryAfterSeconds: number | undefined;
	constructor(retryAfterSeconds?: number, traceId?: string) {
		super(429, traceId);
		this.name = 'RateLimitError';
		this.retryAfterSeconds = retryAfterSeconds;
		this.message =
			retryAfterSeconds !== undefined
				? `Too many requests. Try again in ${retryAfterSeconds} seconds.`
				: 'Too many requests. Wait a moment and try again.';
	}
}
// NetworkError, TimeoutError, ServerError, AuthError, NotFoundError, ConflictError, ScopeInvalidError,
// isApiError, TRANSPORT_ERROR, REFRESH_FAILED: keep the current bodies unchanged.
```

In `use-form.svelte.ts`:

- Make `reset` take an optional seed: `function reset(next?: z.input<TSchema>): void { values = { ...(next ?? initial) }; … }` and update the `Form` interface to `reset(next?: z.input<TSchema>): void`.
- In the `submit` catch, use:

```ts
if (err instanceof ValidationError && err.hasFieldErrors) {
	errors = err.fields as FieldErrors;
} else if (err instanceof ApiError) {
	bannerError = err.message || 'An unexpected error occurred';
} else {
	bannerError = 'An unexpected error occurred';
}
```

In `src/lib/server/proxy.ts`, set `FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'retry-after', 'x-correlation-id']`.

- [ ] **Step 4:** Run the suites (they pass) and the gate set. Fix the two `new ValidationError(...)` test call sites listed by `grep -rn "new ValidationError" tests` to the new argument order.
- [ ] **Step 5:** Commit `fix(api): read Go's error envelope (error/message/detail/errors), SchemaError, RateLimitError, correlation id`.

---

### Task 3: API client v2 and the legacy alias

**Files**

- Modify: `src/lib/api/client.ts` (complete replacement), every `src/lib/features/**/api.ts` (rename `api` to `apiLegacy`, nothing else)
- Test: `tests/unit/api/client.test.ts` (new)

**Interfaces (produces)**

- `api.get<S>(path, schema, opts?): Promise<z.output<S>>`
- `api.post` / `api.put` / `api.patch` / `api.delete` `(path, body?, opts?): Promise<void>`. Any 2xx is success and the body is ignored (204, or 201/200 with an id).
- `api.postJson` / `putJson` / `patchJson` / `deleteJson` `<S>(path, body, schema, opts?): Promise<z.output<S>>`
- `interface RequestOptions { query?: QueryParams; signal?: AbortSignal; timeoutMs?: number; headers?: Record<string, string> }`
- `type QueryParams = Readonly<Record<string, QueryValue>>`. `undefined`, `null` and `''` are dropped; arrays are repeated keys.
- `buildQueryString(query?): string`
- `parseWith(schema, data, endpoint): output` (throws `SchemaError`)
- `DEFAULT_TIMEOUT_MS = 15_000`
- `apiLegacy` and `parseResponse` are `@deprecated`. They are the old call style over the new transport, and `parseResponse` now throws `SchemaError`. Task 30 deletes both.
- Path rule (enforced in Task 10): the first argument of every `api.*` call is a string or template literal. Query strings go in `opts.query`, never in the path.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/client.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { api, buildQueryString } from '#lib/api/client.ts';
import { ConflictError, SchemaError, TimeoutError } from '#lib/api/errors.ts';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => fetchMock.mockReset());
const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

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
});
```

- [ ] **Step 2:** Run it; it fails.

- [ ] **Step 3: Implement `src/lib/api/client.ts`**

```ts
/**
 * Browser → BFF (/api/*) client. The BFF proxy adds the Bearer token and X-Tenant-Id.
 * Two call styles, because Go mutations answer 204 or an id-only 201/200 (backend-checklist #9):
 *   api.post(path, body)                 → void (any 2xx)
 *   api.postJson(path, body, schema)     → parsed body (only when the caller needs the id)
 * Paths are literals (checked by tests/unit/contract/gateway-routes.test.ts); query params go in opts.query.
 */
import type { z } from 'zod';
import { ApiError, SchemaError, type ApiErrorBody } from './errors.ts';
import { getCsrfToken } from './csrf.ts';
import { isOperatorScopePath, SCOPE_REQUIRED_HEADER } from './scope-header.ts';

export const DEFAULT_TIMEOUT_MS = 15_000;
export type QueryValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| readonly (string | number)[];
export type QueryParams = Readonly<Record<string, QueryValue>>;
export interface RequestOptions {
	query?: QueryParams;
	signal?: AbortSignal;
	timeoutMs?: number;
	headers?: Record<string, string>;
}
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function buildQueryString(query?: QueryParams): string {
	if (!query) return '';
	const qs = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null || value === '') continue;
		if (Array.isArray(value)) {
			for (const v of value) if (v !== '') qs.append(key, String(v));
		} else {
			qs.set(key, String(value));
		}
	}
	const s = qs.toString();
	return s ? `?${s}` : '';
}

function safeJsonParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

async function send(
	method: Method,
	path: string,
	body: unknown,
	opts: RequestOptions = {}
): Promise<unknown> {
	const headers = new Headers(opts.headers);
	headers.set('Accept', 'application/json');
	if (body !== undefined) headers.set('Content-Type', 'application/json');
	if (typeof location !== 'undefined' && isOperatorScopePath(location.pathname))
		headers.set(SCOPE_REQUIRED_HEADER, '1');
	if (method !== 'GET') {
		const csrf = getCsrfToken();
		if (csrf) headers.set('X-CSRF-Token', csrf);
	}
	const timeout = AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
	let response: Response;
	let text: string;
	try {
		response = await fetch(`/api${path}${buildQueryString(opts.query)}`, {
			method,
			headers,
			credentials: 'same-origin',
			body: body === undefined ? undefined : JSON.stringify(body),
			signal
		});
		text = await response.text();
	} catch (cause) {
		if (opts.signal?.aborted) throw opts.signal.reason ?? cause;
		throw ApiError.transport(cause);
	}
	const data = text.length > 0 ? safeJsonParse(text) : undefined;
	if (!response.ok) throw ApiError.fromResponse(response, (data ?? null) as ApiErrorBody | null);
	return data;
}

export function parseWith<S extends z.ZodType>(
	schema: S,
	data: unknown,
	endpoint: string
): z.output<S> {
	const result = schema.safeParse(data);
	if (result.success) return result.data;
	const issues = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
	if (import.meta.env.DEV)
		console.error('[api] response does not match the Go contract', endpoint, issues);
	throw new SchemaError(endpoint, issues);
}

const voidCall =
	(method: Method) =>
	async (path: string, body?: unknown, opts?: RequestOptions): Promise<void> => {
		await send(method, path, body, opts);
	};
const jsonCall =
	(method: Method) =>
	async <S extends z.ZodType>(
		path: string,
		body: unknown,
		schema: S,
		opts?: RequestOptions
	): Promise<z.output<S>> =>
		parseWith(schema, await send(method, path, body, opts), `${method} ${path}`);

export const api = {
	get: async <S extends z.ZodType>(
		path: string,
		schema: S,
		opts?: RequestOptions
	): Promise<z.output<S>> =>
		parseWith(schema, await send('GET', path, undefined, opts), `GET ${path}`),
	post: voidCall('POST'),
	put: voidCall('PUT'),
	patch: voidCall('PATCH'),
	delete: voidCall('DELETE'),
	postJson: jsonCall('POST'),
	putJson: jsonCall('PUT'),
	patchJson: jsonCall('PATCH'),
	deleteJson: jsonCall('DELETE')
};

/** @deprecated Old call style for gateways not yet re-contracted; deleted in Task 30. */
export const apiLegacy = {
	get: <T>(path: string) => send('GET', path, undefined).then((d) => (d ?? null) as T),
	post: <T>(path: string, json?: unknown) => send('POST', path, json).then((d) => (d ?? null) as T),
	put: <T>(path: string, json?: unknown) => send('PUT', path, json).then((d) => (d ?? null) as T),
	patch: <T>(path: string, json?: unknown) =>
		send('PATCH', path, json).then((d) => (d ?? null) as T),
	delete: <T>(path: string, json?: unknown) =>
		send('DELETE', path, json).then((d) => (d ?? null) as T)
};

/** @deprecated Use api.get/postJson with a schema; deleted in Task 30. */
export function parseResponse<S extends z.ZodType>(schema: S, raw: unknown): z.output<S> {
	return parseWith(schema, raw, 'legacy');
}

export { isApiError } from './errors.ts';
```

Rename in every `src/lib/features/**/api.ts`:

- `import { api, parseResponse } from '$api/client'` becomes `import { apiLegacy, parseResponse } from '#lib/api/client.ts'`
- every `api.` becomes `apiLegacy.`

Before renaming, confirm no legacy caller passes a third options argument: `grep -rnE "api\.(get|post|put|patch|delete)<[^>]*>\([^)]*,[^)]*," src/lib/features`. If one does, move that option into the path (none expected). `tests/unit/api/private-cache-triggers.test.ts` imports the client: change its import only.

- [ ] **Step 4:** Run the test (passes) and the gate set.
- [ ] **Step 5:** Commit `feat(api): client v2 — void vs JSON mutations, query option, timeout + signal; legacy alias for un-migrated gateways`.

---

### Task 4: Shared mutation and pagination helpers; infinite-list signal; `setMany`

**Files**

- Create: `src/lib/api/mutations.ts`, `src/lib/api/pagination.ts`
- Modify:
  - `src/lib/hooks/use-infinite-list.svelte.ts` (`signal` in the queryFn context)
  - `src/lib/hooks/use-url-filters.svelte.ts` (`setMany`)
  - `src/lib/hooks/use-saved-views.svelte.ts` (`activate` uses `setMany`)
- Tests: `tests/unit/api/mutations.test.ts`, `tests/unit/api/pagination.test.ts`, `tests/unit/hooks/use-url-filters.test.ts`

**Interfaces (produces)**

- `createResourceMutation<TVars, TData = void>(options: ResourceMutationOptions<TVars, TData>)` and `resourceMutationOptions(qc, options)` (the pure part, unit-tested).
- `ResourceMutationOptions`: `{ fn; invalidate(vars, data): readonly QueryKey[]; successToast?: string | ((vars, data) => string); inlineErrors?: boolean; onSuccess?(data, vars) }`.
- `DEFAULT_PAGE_SIZE = 50`, `MAX_PAGE_SIZE = 200`.
- `interface CursorParams { cursor?: string; page_size?: number }` and `interface Page<T> { items: T[]; has_more: boolean; next_cursor?: string }`.
- `cursorQuery(p?)`, `toPage(envelope, key)`, `fetchAllPages(fetchPage, maxPages = 50)`.
- `InfiniteListOptions.queryFn(ctx: { cursor: string | undefined; signal: AbortSignal })`.
- `UrlFilters.setMany(patch: Partial<TFilters>, opts?: { clearOthers?: boolean }): void` (one `goto`).
- `SavedViews.activate(id)` calls `setMany(view.filters, { clearOthers: true })`. "All" therefore clears every filter in the schema.

**Cache coherence rules** (all hooks from here on must follow them; state them in the module doc of `mutations.ts`):

1. A mutation invalidates the detail key of every entity it changes, plus every list prefix that shows that entity. Invalidation is awaited, so the mutation resolves after the refetch.
2. No `setQueryData` from mutation responses. Go returns no DTO.
3. Optimistic updates (lead stage and temperature only) use `useOptimisticMutation`, which snapshots, projects, rolls back and invalidates on settle.
4. A form or dialog that shows the error inline sets `inlineErrors: true`. That sets `meta.skipErrorToast` and avoids a double toast. Otherwise the global `MutationCache` toast is the only error toast, and hooks never toast errors themselves.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/api/pagination.test.ts
import { describe, expect, it, vi } from 'vitest';
import { cursorQuery, fetchAllPages, toPage } from '#lib/api/pagination.ts';

describe('pagination', () => {
	it('cursorQuery passes only cursor and page_size', () => {
		expect(cursorQuery({ cursor: 'c', page_size: 50 })).toEqual({ cursor: 'c', page_size: 50 });
	});
	it('toPage normalises any envelope key and an omitted next_cursor', () => {
		expect(toPage({ users: [1], has_more: false }, 'users')).toEqual({
			items: [1],
			has_more: false,
			next_cursor: undefined
		});
	});
	it('fetchAllPages follows next_cursor until has_more is false', async () => {
		const fetchPage = vi
			.fn()
			.mockResolvedValueOnce({ items: [1, 2], has_more: true, next_cursor: 'n1' })
			.mockResolvedValueOnce({ items: [3], has_more: false });
		await expect(fetchAllPages(fetchPage)).resolves.toEqual([1, 2, 3]);
		expect(fetchPage).toHaveBeenNthCalledWith(2, 'n1');
	});
});
```

```ts
// tests/unit/api/mutations.test.ts
import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
vi.mock('$ui', () => ({ toast: { success: vi.fn() } }));
import { toast } from '$ui';
import { resourceMutationOptions } from '#lib/api/mutations.ts';

describe('resourceMutationOptions', () => {
	it('awaits invalidation of every key, then toasts', async () => {
		const qc = new QueryClient();
		const spy = vi.spyOn(qc, 'invalidateQueries');
		const opts = resourceMutationOptions(qc, {
			fn: async (_: { id: string }) => undefined,
			invalidate: ({ id }) => [
				['leads', 'detail', id],
				['leads', 'list']
			],
			successToast: 'Saved'
		});
		await opts.onSuccess?.(undefined, { id: 'a' }, undefined as never, undefined as never);
		expect(spy).toHaveBeenCalledWith({ queryKey: ['leads', 'detail', 'a'] });
		expect(spy).toHaveBeenCalledWith({ queryKey: ['leads', 'list'] });
		expect(toast.success).toHaveBeenCalledWith('Saved');
	});
	it('sets skipErrorToast when the caller shows errors inline', () => {
		const opts = resourceMutationOptions(new QueryClient(), {
			fn: async () => undefined,
			invalidate: () => [],
			inlineErrors: true
		});
		expect(opts.meta).toEqual({ skipErrorToast: true });
	});
});
```

`tests/unit/hooks/use-url-filters.test.ts`:

- Mock `$app/navigation` with `goto: vi.fn()`.
- Mock `$app/state` with `page: { url: new URL('http://x/leads?stage=new&name=ab&view=table') }`.
- Create filters with schema `{ stage, name, temperature }` (no `view`).
- Call `setMany({ temperature: 'hot' }, { clearOthers: true })`.
- Expect `goto` to be called once with `'/leads?view=table&temperature=hot'`.

- [ ] **Step 2:** Run the suites; they fail.

- [ ] **Step 3: Implement**

```ts
// src/lib/api/pagination.ts
/** Cursor pagination as Go implements it: ?cursor=&page_size= (users_http.go:73-79, crm/ports/http.go:119-129),
 * envelope { <items|users|events|requests>, has_more, next_cursor? } — next_cursor is omitted on the last page. */
import type { QueryParams } from './client.ts';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
export interface CursorParams {
	cursor?: string;
	page_size?: number;
}
export interface Page<T> {
	items: T[];
	has_more: boolean;
	next_cursor?: string;
}

export function cursorQuery(p: CursorParams = {}): QueryParams {
	return { cursor: p.cursor, page_size: p.page_size };
}
export function toPage<K extends string, T>(
	envelope: { [P in K]: T[] } & { has_more: boolean; next_cursor?: string },
	key: K
): Page<T> {
	return {
		items: envelope[key],
		has_more: envelope.has_more,
		next_cursor: envelope.next_cursor || undefined
	};
}
/** Reads every page (cap: maxPages × page size, 10,000 rows at 200). For Go lists with no server-side search (users). */
export async function fetchAllPages<T>(
	fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
	maxPages = 50
): Promise<T[]> {
	const out: T[] = [];
	let cursor: string | undefined;
	for (let i = 0; i < maxPages; i++) {
		const page = await fetchPage(cursor);
		out.push(...page.items);
		if (!page.has_more || !page.next_cursor) break;
		cursor = page.next_cursor;
	}
	return out;
}
```

```ts
// src/lib/api/mutations.ts  (module doc = the four cache-coherence rules above)
import {
	createMutation,
	useQueryClient,
	type QueryClient,
	type QueryKey
} from '@tanstack/svelte-query';
import { toast } from '$ui';

export interface ResourceMutationOptions<TVars, TData> {
	fn: (vars: TVars) => Promise<TData>;
	invalidate: (vars: TVars, data: TData) => readonly QueryKey[];
	successToast?: string | ((vars: TVars, data: TData) => string);
	inlineErrors?: boolean;
	onSuccess?: (data: TData, vars: TVars) => void | Promise<void>;
}

export function resourceMutationOptions<TVars, TData>(
	qc: QueryClient,
	o: ResourceMutationOptions<TVars, TData>
) {
	return {
		mutationFn: o.fn,
		meta: o.inlineErrors ? { skipErrorToast: true } : undefined,
		onSuccess: async (data: TData, vars: TVars) => {
			await Promise.all(
				o.invalidate(vars, data).map((queryKey) => qc.invalidateQueries({ queryKey }))
			);
			const copy =
				typeof o.successToast === 'function' ? o.successToast(vars, data) : o.successToast;
			if (copy) toast.success(copy);
			await o.onSuccess?.(data, vars);
		}
	};
}

export function createResourceMutation<TVars, TData = void>(
	o: ResourceMutationOptions<TVars, TData>
) {
	const qc = useQueryClient();
	return createMutation<TData, Error, TVars>(() => resourceMutationOptions(qc, o));
}
```

`use-infinite-list.svelte.ts`:

- Change `queryFn` to `({ pageParam, signal }) => options.queryFn({ cursor: pageParam as string | undefined, signal })`.
- Change the option type to `queryFn: (ctx: { cursor: string | undefined; signal: AbortSignal }) => Promise<InfinitePage<T>>`.

`use-url-filters.svelte.ts`:

- Extract the body of `setFilter` into `function applyValue(next: SvelteURLSearchParams, key: string, value: UrlFilterValue): void`.
- `setFilter` becomes `{ const next = cloneParams(); applyValue(next, key, value); commit(next); }`.
- Add `setMany`, and add it to the `UrlFilters` interface:

```ts
setMany(patch, opts = {}) {
	const next = cloneParams();
	if (opts.clearOthers) for (const key in schema) next.delete(key);
	for (const key in patch) applyValue(next, key, patch[key] as UrlFilterValue);
	commit(next);
},
```

`use-saved-views.svelte.ts`: `activate(viewId) { const v = views.find((x) => x.id === viewId); if (v) urlFilters.setMany(v.filters, { clearOthers: true }); }`.

- [ ] **Step 4:** Run the suites (pass) and the gate set.
- [ ] **Step 5:** Commit `feat(data): createResourceMutation, cursor pagination helpers, queryFn signal, useUrlFilters.setMany`.

---

### Task 5: Identity gateways on client v2 — auth, users, roles, permission requests (+ the 204 fixes)

**Files to modify**

- `src/lib/features/auth/{api,queries}.ts`
- `src/lib/features/users/{api,queries,index}.ts`
- `src/lib/features/users/components/UsersList.svelte`
- `src/routes/(app)/settings/roles/+page.svelte`, `src/routes/(app)/operator/scope/roles/+page.svelte` (roster from the new users list shape)
- `src/lib/features/roles/{api,queries}.ts`
- `src/lib/features/permission-requests/{api,queries}.ts`
- `src/lib/features/users/components/DeactivateUserDialog.svelte` (only its `mutate` call; Task 15 migrates the dialog)

**Tests:** `tests/unit/features/users/api.test.ts`, `tests/unit/features/roles/api.test.ts` (both new)

**Interfaces**

- Consumes `api`, `cursorQuery`, `toPage`, `fetchAllPages`, `createResourceMutation`.
- Produces in users:
  - `listUsersPage(p: CursorParams, signal?): Promise<Page<UserDto>>`
  - `listAllUsers(signal?): Promise<UserDto[]>` (uses page_size `MAX_PAGE_SIZE`)
  - `usersListQuery()` with `data: UserDto[]`
  - `deactivateUser(id, body): Promise<void>`, `reactivateUser(id): Promise<void>`
  - `searchMemberships` moves to `apiLegacy` unchanged (deleted in Task 18)
- Produces in roles: `updateRole(id, req): Promise<void>`, `setRoleParent(id, body): Promise<void>`
- Produces in permission requests: `listPermissionRequests(params: { role?: 'mine' | 'approver'; cursor?; page_size? }, signal?)`. It sends `page_size`, not `limit`; keep the role values the file already uses. Returns `Page<PermissionRequestDto>` via `toPage(r, 'requests')`.

**Gateway rewrite rule:**

- `const raw = await apiLegacy.get<unknown>(P); return parseResponse(S, raw);` becomes `return api.get(P, S, { signal });`
- void calls become `await api.post(P, body)`
- calls that need an id become `api.postJson(P, body, S)`

Every query function forwards `signal`: `queryFn: ({ signal }) => api.x(…, signal)`.

**Go facts**

- `users_http.go:61-79`: `GET /v1/users` takes `cursor` and `page_size` (default 50, max 200) and returns active members only, as `{users, has_more, next_cursor?}`.
- `deactivate` and `reactivate` return 204 (`users_http.go:135,162`).
- `roles_http.go:182`: `PATCH /roles/{id}` returns 204. `roles_http.go:143`: `PATCH /roles/{id}/parent` returns 204.

- [ ] **Step 1: Write failing tests**
- `users/api.test.ts`, with fetch stubbed as in Task 3:
  - `listAllUsers` follows two pages: GET `/api/v1/users?page_size=200`, then `?cursor=n1&page_size=200`.
  - `deactivateUser` resolves on 204.
- `roles/api.test.ts`: `updateRole` and `setRoleParent` resolve on 204.

- [ ] **Step 2:** Run them; they fail (the legacy gateways throw on 204).

- [ ] **Step 3: Implement**
- Rewrite every gateway in the four `api.ts` files with the rule above. Responses keep the current hand-written schemas; Task 7 replaces them.
- `users/api.ts`:

```ts
export async function listUsersPage(p: CursorParams, signal?: AbortSignal): Promise<Page<UserDto>> {
	return toPage(
		await api.get('/v1/users', listUsersResponseSchema, { query: cursorQuery(p), signal }),
		'users'
	);
}
export function listAllUsers(signal?: AbortSignal): Promise<UserDto[]> {
	return fetchAllPages((cursor) => listUsersPage({ cursor, page_size: MAX_PAGE_SIZE }, signal));
}
```

`listUsersResponseSchema` gains `has_more: z.boolean(), next_cursor: z.string().optional()`.

- Rewrite every mutation hook in `users/queries.ts`, `roles/queries.ts` and `permission-requests/queries.ts` with `createResourceMutation`, keeping each hook's toast copy and its invalidation (now explicit). Examples:
  - `deactivateUserMutation = () => createResourceMutation({ fn: ({ id, reason }: { id: string; reason: string }) => api.deactivateUser(id, { reason }), invalidate: ({ id }) => [usersKeys.detail(id), usersKeys.list()], successToast: 'Member deactivated', inlineErrors: true })`
  - `updateRoleMutation`: invalidate `[rolesKeys.detail(id), rolesKeys.all]`, toast `'Role updated'`
  - `setRoleParentMutation`: invalidate `[rolesKeys.all]`
- Remove local `onError` toasts (double toasts, worklist #11).
- In `auth/queries.ts`, keep `capabilitiesKey` and the `initialData` seeding as is, and forward `signal`.
- `UsersList.svelte`: `const userList = $derived(listQuery.data ?? [])`. Same change for both roster pages (`usersQuery.data ?? []`).
- Comments: delete every "returns the updated DTO" / "rule 11" comment in the touched files.

- [ ] **Step 4:** Run the suites and gates. Run `CI=1 npx playwright test tests/e2e/tenant-user-management.spec.ts tests/e2e/tenant-roles-management.spec.ts tests/e2e/permission-requests.spec.ts tests/e2e/account-self-service.spec.ts --project=chromium --retries=0`. Where a fixture returned a DTO for deactivate, reactivate, role update or role parent, change it to `status: 204` with no body. Add `has_more: false` to `/api/v1/users` list fixtures.
- [ ] **Step 5:** Commit `fix(identity): users/roles/permission-request gateways on client v2; 204 mutations invalidate; users list reads every page`.

---

### Task 6: Identity gateways on client v2 — tenant, operator tenants/impersonation/stats, search

**Files to modify**

- `src/lib/features/tenant/api.ts`
- `src/lib/features/operator/tenants/{api,queries}.ts`
- `src/lib/features/operator/impersonation/api.ts`
- `src/lib/features/operator/dashboard/{api,queries}.ts`
- `src/lib/features/operator/scope/queries.ts` (remove local error toasts only)
- `src/lib/features/search/{api,queries}.ts`
- `src/routes/(app)/operator/scope/settings/+page.svelte`

**Tests:** `tests/unit/features/operator/tenants/api.test.ts`

**Interfaces**

- `suspendTenant`, `activateTenant`, `markForDeletion`, `restoreTenant` become `Promise<void>`. Go: `tenant_http.go:319` → `writeTenantMutationResult` returns 204.
- Their mutations invalidate `[tenantsKeys.all]` and, when called from the scope tree, also run `refreshAll()`. The scope layout's `page.data.tenant` comes from a server load, so the hook takes `{ reloadPageData?: boolean }`: `onSuccess: () => opts.reloadPageData ? refreshAll() : undefined`.
- `operator/scope/settings/+page.svelte` passes `reloadPageData: true` through the dialogs' new `reloadPageData` prop (add the prop to `SuspendDialog` and `MarkForDeletionDialog`; Task 15 replaces their bodies).
- `searchOmni(q, signal)`: Go `search_http.go:42-50` reads `q`, `limit` and `include`; keep them via `opts.query`.

- [ ] **Step 1:** Write a failing test: `suspendTenant` resolves on 204.
- [ ] **Step 2:** Run it; it fails.
- [ ] **Step 3:** Rewrite these gateways and hooks with the Task 5 rule. Remove the `onError: () => toast.error(...)` calls in `operator/scope/queries.ts` (the global handler toasts once).
- [ ] **Step 4:** Run the suites and gates, then `CI=1 npx playwright test tests/e2e/operator-tenant-management.spec.ts tests/e2e/tenant-settings.spec.ts tests/e2e/cmd-k-search.spec.ts tests/e2e/operator-impersonation.spec.ts --project=chromium --retries=0`. Tenant lifecycle fixtures become `status: 204`.
- [ ] **Step 5:** Commit `fix(operator): tenant lifecycle 204s invalidate (and refresh scope data); identity gateways on client v2`.

---

### Task 7: Schemas derived from generated Zod; optional capabilities fields; tenant status enum

**Files to modify**

- `src/lib/features/auth/{schemas,types}.ts`
- `src/lib/features/auth/stores/session.svelte.ts` (`email` optional)
- `src/lib/features/users/schemas.ts`
- `src/lib/features/roles/schemas.ts`
- `src/lib/features/tenant/{schemas,types,view-models}.ts`
- `src/lib/features/operator/tenants/{schemas,view-models}.ts`
- `src/lib/features/operator/tenants/components/TenantsList.svelte`
- `src/lib/features/permission-requests/schemas.ts`
- `src/lib/features/operator/impersonation/schemas.ts`
- `src/lib/features/operator/dashboard/schemas.ts`
- `src/lib/features/search/schemas.ts`

**Tests to rewrite:** `tests/unit/features/{auth,users,roles,tenant}/schemas.test.ts`, `tests/unit/features/operator/tenants/*`

**Interfaces (produces; each response schema is the generated schema, `.extend`ed only where the web needs a default or a correction)**

```ts
// auth/schemas.ts
import {
	CapabilitiesDto,
	UserDto,
	ListSessionsResponse,
	ChangePasswordRequest,
	ResetPasswordRequest,
	LoginRequest,
	RevokeAllSessionsResponse,
	UpdateUserProfileRequest
} from '#lib/api/generated/index.ts';

/** email/first_name/last_name are omitzero in Go (me_http.go:97-101) — optional; a missing name never signs the user out. */
export const capabilitiesSchema = CapabilitiesDto;
export type Capabilities = z.output<typeof capabilitiesSchema>;
export const userDtoSchema = UserDto.extend({
	designation: z.string().default(''),
	department: z.string().default(''),
	status_message: z.string().default('')
});
export const listSessionsResponseSchema = ListSessionsResponse;
export const revokeOtherSessionsResponseSchema = RevokeAllSessionsResponse;
export const loginRequestSchema = LoginRequest.pick({ email: true, password: true }).extend({
	email: z.string().min(1, 'Email is required').email('Invalid email format'),
	password: z.string().min(1, 'Password is required')
});
export const changePasswordSchema = ChangePasswordRequest.extend({
	current_password: z.string().min(1, 'Current password is required'),
	new_password: z.string().min(12, 'Password must be at least 12 characters')
});
export const resetPasswordSchema = ResetPasswordRequest;
export const updateProfileRequestSchema = UpdateUserProfileRequest.extend({
	designation: z.string().max(120),
	department: z.string().max(120),
	status_message: z.string().max(280)
}).strict();
```

Changes in the other files:

- `users/schemas.ts`: `listUsersResponseSchema = ListUsersResponse.extend({ users: z.array(userDtoSchema) })`, `createUserResponseSchema = CreateUserResponse`. Request schemas keep their UI messages but are built as `CreateUserRequest.extend({...})`.
- `roles/schemas.ts`: `roleDtoSchema = RoleDto`, `listRolesResponseSchema = ListRolesResponse`, `createRoleResponseSchema = CreateRoleResponse`.
- `tenant/schemas.ts`:

```ts
/** Go code values (identity/domain/tenant/status.go:26-70). api/openapi.yaml:3358 is wrong (backend-checklist #12). */
export const tenantStatusSchema = z.enum([
	'pending',
	'active',
	'suspended',
	'pending_deletion',
	'deleted'
]);
export const tenantSchema = TenantDto.extend({ status: tenantStatusSchema });
export type TenantStatus = z.output<typeof tenantStatusSchema>;
```

- `operator/tenants/schemas.ts`: `listAllTenantsResponseSchema = z.object({ tenants: z.array(tenantSchema) })`, `registerTenantResponseSchema = RegisterTenantResponse`.
- `permission-requests/schemas.ts`: `permissionRequestDtoSchema = PermissionRequestDto`, `listPermissionRequestsResponseSchema = ListPermissionRequestsResponse`, `createPermissionRequestResponseSchema = CreatePermissionRequestResponse`.
- impersonation: `CreateImpersonationSessionResponse.pick({ session_id: true, expires_at_utc: true })`, `ListImpersonationSessionsResponse`.
- dashboard: `platformStatsSchema = PlatformStatsResponse`.
- search: `SearchResponse`, `SearchPersonHit`, `SearchTenantHit`.

Consumers:

- `SessionPrincipal.email` becomes `email?: string`. `session.svelte.ts` copies `caps.email`. Every `principal.email` / `caps.email` reader in UserMenu and the dashboards uses `?? ''`; find them with `grep -rn "\.email" src/lib/layouts src/lib/features/dashboard src/lib/features/auth`.
- `TenantsList.svelte` counts and chips use `pending_deletion` (label "Pending deletion").
- `operator/tenants/view-models.ts`: replace `'marked_for_deletion'` with `'pending_deletion'`. Task 13 merges the two tenant status maps.

- [ ] **Step 1:** Write failing tests:
  - `capabilitiesSchema.safeParse({...caps without email/first_name/last_name}).success === true`
  - `tenantSchema` accepts `status: 'pending_deletion'` and rejects `'marked_for_deletion'`
  - `userDtoSchema` accepts a body without `joined_at` (Go `omitzero`) and rejects `status: 'pending'`
- [ ] **Step 2:** Run them; they fail.
- [ ] **Step 3:** Implement as listed. Update the schema unit tests' fixtures to use RFC-valid UUIDs (`00000000-0000-4000-8000-0000000000xx`).
- [ ] **Step 4:** Run the gates. Then `tests/unit/server/capabilities.test.ts` must pass with a body lacking `email`. Add that case if it is not there yet: `loadCapabilities` returns caps rather than `null`.
- [ ] **Step 5:** Commit `fix(identity): schemas derived from the generated Go contract; capabilities names optional; tenant status uses Go's pending_deletion/deleted`.

---

### Task 8: Pre-login Go calls (`goAuthFetch`), Go error codes in server actions, one `GoErrorBody`

**Files**

- Modify:
  - `src/lib/server/go.ts` (export `goAuthFetch`; `GoErrorBody` aliases `ApiErrorBody`; `flattenGoErrors` delegates to `flattenFieldErrors`)
  - `src/routes/(auth)/signin/+page.server.ts`
  - `src/routes/(auth)/forgot-password/+page.server.ts`
  - `src/routes/(auth)/reset-password/+page.server.ts`
  - `src/routes/(app)/must-change-password/+page.server.ts`
  - `src/routes/(app)/settings/account/security/+page.server.ts`
- Create: `src/lib/server/auth-errors.ts`
- Tests: `tests/unit/server/auth-errors.test.ts`, `tests/unit/server/go.test.ts` (add `goAuthFetch` cases)

**Go codes** (verified in `internal/identity/ports/errcodes.go` and `http.go`):

| Action                                   | Go status / code                                                                                                                                           | Web mapping                                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| reset-password (`http.go:660-690`)       | 400 `reset_token_invalid` (:673); 422 `password_breached` (:676); 422 `password_same_as_current` (:680); 400 `invalid_password` (:685); 400 `invalid_body` | invalidToken banner / breached / same / weak (field `new_password`); `invalid_body` → unexpected                                   |
| change-password (`http.go:463-510`)      | 401 `incorrect_current_password` (:493); 422 `password_breached` (:496); 422 `password_same_as_current` (:500); 400 `invalid_password` (:509)              | incorrectCurrent / breached / same / weak                                                                                          |
| request-email-change (`http.go:696-750`) | 400 `invalid_email` (:710); taken or rejected collapse to 204 (:718-745)                                                                                   | `invalid_email` → field error `auth.changeEmail.errors.invalid`; delete the 409 branch (anti-enumeration: Go never sends 409 here) |
| login                                    | 401 `invalid_credentials`, 423 `account_locked` + Retry-After, 429 rate limit                                                                              | unchanged + 429 → `auth.errors.rateLimited` (add the key to `en` and `hi`)                                                         |

**Interfaces (produces)**

- `goAuthFetch(path: \`/v1/${string}\`, init?: { method?: 'POST'; body?: unknown }): Promise<Response>`. It POSTs JSON to Go with `redirect: 'manual'` and the upstream timeout (`upstreamTimeout`from`proxy.ts`, `config.UPSTREAM_TIMEOUT_MS`), and has no auth or scope. It throws on transport failure; callers catch with `isUpstreamTimeout`and return`fail(502|504)`. Task 31 adds the forwarding headers.
- `readGoError(resp): Promise<ApiErrorBody>` (unchanged name; type now `ApiErrorBody`); `GoErrorBody` stays as `export type GoErrorBody = ApiErrorBody`.
- In `auth-errors.ts`: `passwordErrorKey(status: number, code: string | undefined): { field?: 'new' | 'current'; key: string } | null`.

```ts
// src/lib/server/auth-errors.ts
/** One mapping for every Go password error (reset, change, forced change). Codes: identity/ports/errcodes.go:67-101. */
export function passwordErrorKey(
	status: number,
	code: string | undefined
): { field: 'new' | 'current'; key: string } | null {
	if (status === 401 && code === 'incorrect_current_password')
		return { field: 'current', key: 'account.security.changePassword.errors.incorrectCurrent' };
	if (code === 'password_breached')
		return { field: 'new', key: 'auth.resetPassword.errors.breached' };
	if (code === 'password_same_as_current')
		return { field: 'new', key: 'auth.resetPassword.errors.same' };
	if (code === 'invalid_password') return { field: 'new', key: 'auth.resetPassword.errors.weak' };
	return null;
}
export const RESET_TOKEN_INVALID = 'reset_token_invalid';
```

- [ ] **Step 1: Write the failing tests**
  - `passwordErrorKey(422, 'password_same_as_current')` → `{ field: 'new', key: 'auth.resetPassword.errors.same' }`
  - `passwordErrorKey(401, 'incorrect_current_password')` → `field: 'current'`
  - `passwordErrorKey(400, 'invalid_body')` → `null`
  - `goAuthFetch` sends `redirect: 'manual'` and JSON, and rejects on fetch failure
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement `goAuthFetch` in `go.ts` (next to `goFetch`). Replace the raw `fetch(\`${config.GO_API_URL}/api/v1/auth/...\`)`calls in signin, forgot and reset with it. In reset, must-change and security, delete the local`interface GoErrorBody`and the`body.code ?? ''` reads, and use:

```ts
const body = await readGoError(resp);
if (resp.status === 400 && body.error === RESET_TOKEN_INVALID)
	return fail(400, { formErrorKey: 'auth.resetPassword.errors.invalidToken' });
const mapped = passwordErrorKey(resp.status, body.error);
if (mapped)
	return fail(resp.status, {
		fieldKeys: { [mapped.field === 'new' ? 'new_password' : 'current']: mapped.key }
	});
return fail(goErrorStatus(resp), { formErrorKey: 'auth.errors.unexpected' });
```

Field-key names differ per page: reset uses `new_password`, security and must-change use `new` and `current`. Keep each page's existing names. In `go.ts`, `flattenGoErrors(body) => flattenFieldErrors(body.errors)` (import from `#lib/api/errors.ts`).

- [ ] **Step 4:** Run the gates, then `CI=1 npx playwright test tests/e2e/forgot-password.spec.ts tests/e2e/account-self-service.spec.ts tests/e2e/auth-must-change-and-lockout.spec.ts tests/e2e/email-change.spec.ts --project=chromium --retries=0`. Change error fixtures to `{ error: '<go code>', message: '' }`, delete the scenarios for `invalid_token`/`token_consumed`/`token_expired`, and add one `reset_token_invalid` scenario.
- [ ] **Step 5:** Commit `fix(auth): server actions read Go's error codes (reset_token_invalid, password_same_as_current, …); goAuthFetch; one GoErrorBody`.

---

### Task 9: Cookie lifetimes aligned with Go

**Files:** `src/lib/server/cookies.ts`; `src/hooks.server.ts` (comment only: "10-minute expiry"); test `tests/unit/server/cookies.test.ts`

- [ ] **Step 1:** Add failing assertions: `setAuthCookies` sets the access cookie `maxAge: 600` and refresh, csrf and mcp `maxAge: 1_209_600`.
- [ ] **Step 2:** Run; it fails.
- [ ] **Step 3:** Set:

```ts
/** Go access JWT lifetime (internal/identity/app/jwt/jwt.go:30). */
const ACCESS_MAX_AGE = 10 * 60;
/** Go refresh family: 14 days, rolling — every refresh re-sets the cookie (backend-checklist #13). */
const REFRESH_MAX_AGE = 14 * 24 * 3600;
```

Update the header comment ("15-minute" becomes "10-minute"; "30 days" becomes "14 days rolling").

- [ ] **Step 4:** Run the gates.
- [ ] **Step 5:** Commit `fix(bff): cookie lifetimes match Go (10 min access, 14 days rolling refresh)`.

---

### Task 10: Contract guards — fixture validator, gateway route scan, spec-valid identity fixtures

**Files**

- Create:
  - `tests/e2e/helpers/contract.ts`
  - `tests/unit/contract/fixture-contract.test.ts`
  - `tests/unit/contract/gateway-routes.test.ts`
- Modify:
  - `tests/e2e/helpers/mock.ts` (validate on register)
  - `tests/e2e/mock-server/server.mjs` (record `query`)
  - `tests/e2e/helpers/fake-jwt.ts` (RFC-valid UUIDs, spec-valid DTOs)
  - every identity e2e spec whose fixtures fail validation
  - `tests/visual/fixtures/auth.ts`
  - `tests/a11y/routes.spec.ts`

**Interfaces (produces)**

- `validateFixture(f: MockFixture): string | null` (null = valid), `assertFixtures(fs: MockFixture[]): void` (throws), `UNVALIDATED_PATHS: readonly RegExp[]`, `SPEC_OVERRIDES`.
- `listMockCalls()` entries gain `query: string` (the raw `url.search`).

This guard would have caught all 67 mismatches:

- **MISSING class:** a fixture or gateway path that is not in `api/openapi.yaml` fails registration or the unit scan.
- **SHAPE class:** a fixture body must parse with Go's generated schema. A 204 route must have no body. Error fixtures must use Go's `ErrorResponse` (`error` is required). The web's own schemas then parse those Go-shaped fixtures in e2e.

```ts
// tests/e2e/helpers/contract.ts
import { z } from 'zod';
import {
	endpoints,
	ErrorResponse,
	type GeneratedEndpoint
} from '../../../src/lib/api/generated/openapi-zod.ts';
import { tenantSchema } from '../../../src/lib/features/tenant/schemas.ts';
import type { MockFixture } from './mock.ts';

const seg = (s: string) => (/^(:\w+|\{[^}]+\})$/.test(s) ? '{}' : s);
const template = (path: string) => path.split('/').map(seg).join('/');
const isBodyless = (schema: z.ZodType) => schema.safeParse(undefined).success;

/** Go spec bugs the web deliberately overrides — each cites its checklist entry. */
const tenants = z.object({ tenants: z.array(tenantSchema) });
const SPEC_OVERRIDES: ReadonlyArray<{
	method: string;
	path: string;
	response: z.ZodType;
	reason: string;
}> = [
	{
		method: 'get',
		path: '/api/v1/tenants/{}',
		response: tenantSchema,
		reason: 'backend-checklist #12 tenant status enum'
	},
	{ method: 'get', path: '/api/v1/tenants', response: tenants, reason: 'backend-checklist #12' },
	{
		method: 'get',
		path: '/api/v1/platform/tenants',
		response: tenants,
		reason: 'backend-checklist #12'
	},
	{
		method: 'get',
		path: '/api/v1/tenants/by-slug/{}',
		response: tenantSchema,
		reason: 'backend-checklist #12'
	}
];

/** Areas whose specs still register pre-Go fixtures. Each re-contract task deletes its line; Task 30 asserts the list is empty. */
export const UNVALIDATED_PATHS: readonly RegExp[] = [
	/^\/api\/v1\/crm\//, // Task 19
	/^\/api\/v1\/identity\//, // Task 19 (membership search has no Go route)
	/^\/api\/v1\/orders(\/|$)/, // Task 23
	/^\/api\/v1\/dispatch\//, // Task 23
	/^\/api\/v1\/inventory\//, // Task 26
	/^\/api\/v1\/auth\/me\/activity$/, // Task 27
	/^\/api\/v1\/tenants\/[^/]+\/activity$/, // Task 27
	/^\/api\/v1\/platform\/persons(\/[^/]+\/activity)?$/ // Task 28
];

function pathMatches(concrete: string, tpl: string): boolean {
	const a = concrete.split('/');
	const b = tpl.split('/');
	return a.length === b.length && a.every((s, i) => (b[i] === '{}' ? s !== '' : s === b[i]));
}
function prefixCompatible(prefix: string, tpl: string): boolean {
	const a = prefix.split('/');
	const b = tpl.split('/');
	if (a.length > b.length) return false;
	return a.every((s, i) => {
		const last = i === a.length - 1;
		if (b[i] === '{}') return true;
		return last ? b[i].startsWith(s) : s === b[i];
	});
}
function responseFor(e: GeneratedEndpoint): z.ZodType {
	const tpl = template(e.path);
	return (
		SPEC_OVERRIDES.find((o) => o.method === e.method && o.path === tpl)?.response ?? e.response
	);
}
function bodyError(schema: z.ZodType, body: unknown): string | null {
	if (isBodyless(schema))
		return body === undefined
			? null
			: 'the Go route answers 204 (no body) but the fixture has a body';
	if (body === undefined) return 'the Go route returns a body but the fixture has none';
	const r = schema.safeParse(body);
	return r.success ? null : z.prettifyError(r.error);
}

export function validateFixture(f: MockFixture): string | null {
	const wildcard = f.path.endsWith('*');
	const path = wildcard ? f.path.slice(0, -1) : f.path;
	if (UNVALIDATED_PATHS.some((re) => re.test(path))) return null;
	const method = f.method.toLowerCase();
	const candidates = endpoints.filter(
		(e) =>
			e.method === method &&
			(wildcard ? prefixCompatible(path, template(e.path)) : pathMatches(path, template(e.path)))
	);
	if (candidates.length === 0)
		return `${f.method} ${f.path} is not a route in api/openapi.yaml (the web must not call it)`;
	if (f.status >= 200 && f.status < 300) {
		const errors = candidates.map((e) => bodyError(responseFor(e), f.body));
		return errors.includes(null) ? null : errors[0];
	}
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
```

```ts
// tests/unit/contract/gateway-routes.test.ts
import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { endpoints } from '#lib/api/generated/index.ts';

const norm = (p: string) =>
	p
		.split('?')[0]
		.split('/')
		.map((s) => (/^(:\w+|\{[^}]+\}|\$\{[^}]+\})$/.test(s) ? '{}' : s))
		.join('/');
const SPEC = endpoints.map((e) => ({
	method: e.method.toUpperCase(),
	segs: norm(e.path).split('/')
}));
const exists = (method: string, webPath: string) => {
	const segs = norm(`/api${webPath}`).split('/');
	return SPEC.some(
		(s) =>
			s.method === method &&
			s.segs.length === segs.length &&
			s.segs.every((x, i) => x === '{}' || segs[i] === '{}' || x === segs[i])
	);
};

type Call = { file: string; line: number; method: string; path: string };
const calls: Call[] = [];
const nonLiteral: string[] = [];
const lineOf = (src: string, idx: number) => src.slice(0, idx).split('\n').length;

for (const file of globSync('src/lib/features/**/api.ts')) {
	const src = readFileSync(file, 'utf8');
	for (const m of src.matchAll(
		/\bapi\.(get|post|put|patch|delete|postJson|putJson|patchJson|deleteJson)\(\s*(['`])((?:(?!\2)[\s\S])*)\2/g
	))
		calls.push({
			file,
			line: lineOf(src, m.index!),
			method: m[1].replace('Json', '').toUpperCase(),
			path: m[3]
		});
	for (const m of src.matchAll(
		/\bapi\.(get|post|put|patch|delete|postJson|putJson|patchJson|deleteJson)\(\s*(?![`'])/g
	))
		nonLiteral.push(`${file}:${lineOf(src, m.index!)}`);
}
for (const file of [...globSync('src/routes/**/*.ts'), ...globSync('src/lib/server/**/*.ts')]) {
	const src = readFileSync(file, 'utf8');
	for (const m of src.matchAll(
		/\b(goFetch\(\s*[\w.]+,|goAuthFetch\()\s*(['`])((?:(?!\2)[\s\S])*)\2/g
	)) {
		const tail = src.slice(m.index!, src.indexOf(');', m.index!) + 2);
		const method =
			/method:\s*'(\w+)'/.exec(tail)?.[1] ?? (m[1].startsWith('goAuth') ? 'POST' : 'GET');
		calls.push({ file, line: lineOf(src, m.index!), method, path: m[3] });
	}
}

describe('every web call targets a route in leadkart-go api/openapi.yaml', () => {
	it('finds the gateway calls', () => expect(calls.length).toBeGreaterThan(40));
	it('gateway paths are literals (query params go in opts.query)', () =>
		expect(nonLiteral).toEqual([]));
	it.each(calls.map((c) => [`${c.method} ${c.path} (${c.file}:${c.line})`, c] as const))(
		'%s',
		(_n, c) => {
			expect(exists(c.method, c.path)).toBe(true);
		}
	);
});
```

`tests/unit/contract/fixture-contract.test.ts` exercises `validateFixture` with:

- `{GET /api/v1/users, 200, {users: [], has_more: false}}` → null
- `{GET /api/v1/identity/memberships …}` → null (unvalidated, until Task 19)
- `{GET /api/v1/orders/orders, 200, {}}` → null for now (unvalidated). Add a variant built with `UNVALIDATED_PATHS` filtering disabled through a test-only parameter, `validateFixture(f, { strict: true })`, and expect "not a route". Give `validateFixture` an optional second parameter `{ strict?: boolean }` that skips the unvalidated list.
- `{POST /api/v1/users/x/deactivate, 200, {membership_id: …}}` → "answers 204"
- `{GET /api/v1/tenants/<uuid>, 200, tenant with status 'pending_deletion'}` → null
- `{POST /api/v1/auth/login, 401, {code: 'invalid_credentials'}}` → mentions ErrorResponse

- [ ] **Step 1:** Write both unit tests. Run them: `fixture-contract` fails (the module does not exist). `gateway-routes` passes, because identity gateways now hit real routes and legacy `apiLegacy.` calls are not matched by `\bapi\.`.
- [ ] **Step 2:** Implement `contract.ts`.
  - In `mock.ts`, call `assertFixtures([fixture])` at the top of `registerMock` and `assertFixtures(fixtures)` in `registerMocks`.
  - In `server.mjs`, push `query: url.search` into `calls`, and add `query: string` to the `listMockCalls` type.
  - In `fake-jwt.ts`, use the constants below and make every `fake*` builder produce spec-valid bodies: `fakeTenantDto` status `'active'`, ISO datetimes, `admin_address`/`password_policy` complete; `fakeSessionDto` with a UUID `family_id`.

```ts
export const TEST_TENANT_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_PERSON_ID = '00000000-0000-4000-8000-000000000a01';
export const TEST_MEMBERSHIP_ID = '00000000-0000-4000-8000-000000000b01';
export const TEST_FAMILY_ID = '00000000-0000-4000-8000-0000000000f1';
```

- [ ] **Step 3:** Run every e2e spec outside the unvalidated areas, one file at a time: `CI=1 npx playwright test tests/e2e/<file>.spec.ts --project=chromium --retries=0`. Fix each fixture the validator names: UUIDs, required fields, `{ error }` instead of `{ code }`, 204 bodies removed, list envelopes with `has_more`. Then run `--project=a11y` once for `tests/a11y/routes.spec.ts` and fix its fixtures the same way; its CRM, orders and inventory fixtures stay unvalidated until their tasks.
- [ ] **Step 4:** Run the gates.
- [ ] **Step 5:** Commit `test(contract): mock fixtures and gateway paths are validated against the Go OpenAPI; spec-valid identity fixtures`.

---

### Task 11: Permission semantics and the single nav config

**Files**

- Create:
  - `src/lib/features/auth/permissions.ts`
  - `src/lib/config/nav-icons.ts`
- Modify:
  - `src/lib/features/auth/capabilities.ts` (rewrite)
  - `src/lib/features/auth/stores/session.svelte.ts` (`capabilities`, `can`)
  - `src/lib/features/auth/index.ts` (exports)
  - `src/lib/config/nav.ts` (rewrite, pure)
  - `src/lib/layouts/Sidebar.svelte` (drop its inline tier copy)
  - `src/lib/utils/routeTitle.ts`
  - `src/lib/features/search/components/CommandPalette.svelte` ("Pages" group)
  - `src/lib/layouts/Topbar.svelte` (palette for every signed-in user)
- Tests: `tests/unit/features/auth/tier.test.ts` (rewrite), `tests/unit/config/nav.test.ts` (new)

**Semantics** (Go `internal/identity/ports/authn/authn.go`):

- `RequirePermission` / `RequireAnyPermission` pass if `is_super_user`, or if the JWT `permissions` contain the name (:202-290).
- `RequirePlatform` = `is_platform && tenant_slug == 'platform'`; super users do **not** pass it (:377-397).
- `tenant.admin` is honoured by no gate (checklist #14).

**Decision for `tenant.admin`:** the web keeps "`tenant.admin` grants every `identity.*` check", because the Go team is adding identity permission checks in which `tenant.admin` is expected to satisfy `identity.*`. The rule lives in one function with a comment citing checklist #1 and #14. If Go ships identity gates **without** honouring `tenant.admin`, deleting that one line is the only web change.

**`/inventory` landing:** gated on `inventory.catalog.read|manage`. The landing is the product list (`catalogRead`, `inventory/ports/http.go:51-67`). Stock permissions alone reach nothing: batches live under a product. Stock permissions gate the Batches tab and the movements sheet (Task 25).

```ts
// src/lib/features/auth/permissions.ts
/** Go permission catalogue names the web checks (identity/domain/permission/permission.go). */
export const P = {
	crmLeadsRead: 'crm.leads.read',
	crmLeadsReadAll: 'crm.leads.read_all',
	crmLeadsAssign: 'crm.leads.assign',
	crmLeadsManage: 'crm.leads.manage',
	ordersQuotationsRead: 'orders.quotations.read',
	ordersQuotationsManage: 'orders.quotations.manage',
	ordersOrdersRead: 'orders.orders.read',
	ordersOrdersManage: 'orders.orders.manage',
	ordersInvoicesRead: 'orders.invoices.read',
	ordersPaymentsRecord: 'orders.payments.record',
	inventoryCatalogRead: 'inventory.catalog.read',
	inventoryCatalogManage: 'inventory.catalog.manage',
	inventoryStockRead: 'inventory.stock.read',
	inventoryStockManage: 'inventory.stock.manage',
	dispatchRead: 'dispatch.consignment_notes.read',
	dispatchManage: 'dispatch.consignment_notes.manage',
	tasksRead: 'tasks.work_items.read',
	tasksReadAll: 'tasks.work_items.read_all',
	notificationsRead: 'notifications.inbox.read',
	identityTenantsView: 'identity.tenants.view',
	identityTenantsUpdate: 'identity.tenants.update',
	identityTenantsUpdateSettings: 'identity.tenants.update_settings',
	identityUsersView: 'identity.users.view',
	identityUsersCreate: 'identity.users.create',
	identityUsersUpdate: 'identity.users.update',
	identityUsersDeactivate: 'identity.users.deactivate',
	identityUsersReactivate: 'identity.users.reactivate',
	identityUsersUpdatePermissions: 'identity.users.update_permissions',
	identityRolesView: 'identity.roles.view',
	identityRolesCreate: 'identity.roles.create',
	identityRolesUpdate: 'identity.roles.update',
	identityRolesDelete: 'identity.roles.delete',
	identityRolesAssign: 'identity.roles.assign',
	identityRolesRevoke: 'identity.roles.revoke',
	platformTenantsView: 'platform.tenants.view',
	platformTenantsCreate: 'platform.tenants.create',
	platformTenantsManage: 'platform.tenants.manage',
	platformUsersView: 'platform.users.view',
	platformUsersManage: 'platform.users.manage',
	tenantAdmin: 'tenant.admin'
} as const;
export type Permission = (typeof P)[keyof typeof P];
```

```ts
// src/lib/features/auth/capabilities.ts
import type { Capabilities } from './schemas.ts';
import { P } from './permissions.ts';
export type { Capabilities };
export type PrincipalTier =
	| 'platform-super'
	| 'platform-staff'
	| 'tenant-admin'
	| 'tenant-user'
	| 'unknown';
type Caps = Capabilities | null | undefined;

export const PLATFORM_TENANT_SLUG = 'platform';

/** Mirrors Go RequirePlatform (authn.go:377-397): is_platform AND the platform tenant. Super user does NOT bypass it. */
export function isPlatformCaller(caps: Caps): boolean {
	return Boolean(caps?.is_platform && caps.tenant_slug === PLATFORM_TENANT_SLUG);
}

/**
 * The one permission rule (Go authn.go RequirePermission):
 *   platform.*  → RequirePlatform. The two platform names Go also checks (unverified_contacts.manage,
 *                 lead_credits.topup) are not used by the web.
 *   is_super_user → every other permission.
 *   identity.*  + tenant.admin → granted. WEB RULE, not Go today (backend-checklist #1, #14): the Go team's
 *                 identity gates are expected to honour tenant.admin. If they ship without it, delete this line.
 *   otherwise   → the JWT permissions list.
 */
export function hasCapability(caps: Caps, permission: string): boolean {
	if (!caps) return false;
	if (permission.startsWith('platform.')) return isPlatformCaller(caps);
	if (caps.is_super_user) return true;
	if (permission.startsWith('identity.') && caps.permissions.includes(P.tenantAdmin)) return true;
	return caps.permissions.includes(permission);
}

export type AccessRule =
	| { readonly kind: 'authenticated' }
	| { readonly kind: 'any'; readonly permissions: readonly string[] };
export const AUTHENTICATED: AccessRule = { kind: 'authenticated' };
export const anyOf = (...permissions: string[]): AccessRule => ({ kind: 'any', permissions });
export function canAccess(caps: Caps, rule: AccessRule): boolean {
	if (!caps) return false;
	return rule.kind === 'authenticated' || rule.permissions.some((p) => hasCapability(caps, p));
}

/** Dashboard variant only; navigation is permission-filtered from nav.ts. */
export function deriveTier(caps: Caps): PrincipalTier {
	if (!caps) return 'unknown';
	if (isPlatformCaller(caps)) return caps.is_super_user ? 'platform-super' : 'platform-staff';
	if (caps.is_super_user || caps.permissions.includes(P.tenantAdmin)) return 'tenant-admin';
	return 'tenant-user';
}
```

```ts
// src/lib/config/nav.ts — PURE (server guards import it; no icons, no .svelte)
import type { ResolvedPathname } from '$app/types';
import {
	AUTHENTICATED,
	anyOf,
	canAccess,
	isPlatformCaller,
	type AccessRule,
	type Capabilities
} from '#lib/features/auth/capabilities.ts';
import { P } from '#lib/features/auth/permissions.ts';

export type NavAudience = 'platform' | 'tenant' | 'all';
export type NavSectionId = 'main' | 'operator' | 'administration' | 'crm' | 'account';
export interface NavRoute {
	readonly href: ResolvedPathname;
	readonly label: string;
	readonly section: NavSectionId;
	readonly audience: NavAudience;
	readonly access: AccessRule;
	/** Guards a sub-tree but is not rendered in navigation. */
	readonly hidden?: true;
}

/** THE route/permission config: sidebar, (Phase 2) horizontal nav, command palette, route titles and server guards read it. */
export const NAV_ROUTES = {
	dashboard: {
		href: '/dashboard',
		label: 'Dashboard',
		section: 'main',
		audience: 'all',
		access: AUTHENTICATED
	},
	tenants: {
		href: '/operator/tenants',
		label: 'Tenants',
		section: 'operator',
		audience: 'platform',
		access: anyOf(P.platformTenantsView)
	},
	persons: {
		href: '/operator/persons',
		label: 'People',
		section: 'operator',
		audience: 'platform',
		access: anyOf(P.platformUsersView)
	},
	tenantSettings: {
		href: '/settings/tenant',
		label: 'Tenant settings',
		section: 'administration',
		audience: 'tenant',
		access: anyOf(P.identityTenantsView)
	},
	team: {
		href: '/settings/users',
		label: 'Team',
		section: 'administration',
		audience: 'tenant',
		access: anyOf(P.identityUsersView)
	},
	roles: {
		href: '/settings/roles',
		label: 'Roles',
		section: 'administration',
		audience: 'tenant',
		access: anyOf(P.identityRolesView)
	},
	leads: {
		href: '/leads',
		label: 'Leads',
		section: 'crm',
		audience: 'tenant',
		access: anyOf(P.crmLeadsRead)
	},
	orders: {
		href: '/orders',
		label: 'Orders',
		section: 'crm',
		audience: 'tenant',
		access: anyOf(P.ordersOrdersRead, P.ordersQuotationsRead)
	},
	quotations: {
		href: '/orders/quotations',
		label: 'Quotations',
		section: 'crm',
		audience: 'tenant',
		access: anyOf(P.ordersQuotationsRead),
		hidden: true
	},
	inventory: {
		href: '/inventory',
		label: 'Inventory',
		section: 'crm',
		audience: 'tenant',
		access: anyOf(P.inventoryCatalogRead, P.inventoryCatalogManage)
	},
	permissionRequests: {
		href: '/permission-requests',
		label: 'Permission requests',
		section: 'account',
		audience: 'tenant',
		access: AUTHENTICATED
	},
	account: {
		href: '/settings/account',
		label: 'Account',
		section: 'account',
		audience: 'all',
		access: AUTHENTICATED
	}
} as const satisfies Record<string, NavRoute>;
export type NavRouteKey = keyof typeof NAV_ROUTES;

const SECTIONS: ReadonlyArray<{ id: NavSectionId; title?: string }> = [
	{ id: 'main' },
	{ id: 'operator', title: 'Operator' },
	{ id: 'administration', title: 'Administration' },
	{ id: 'crm', title: 'CRM' },
	{ id: 'account', title: 'Account' }
];

export function audienceMatches(
	caps: Capabilities | null | undefined,
	audience: NavAudience
): boolean {
	if (!caps) return false;
	if (audience === 'all') return true;
	return isPlatformCaller(caps) ? audience === 'platform' : audience === 'tenant';
}
export function canSee(caps: Capabilities | null | undefined, route: NavRoute): boolean {
	return audienceMatches(caps, route.audience) && canAccess(caps, route.access);
}

export interface VisibleNavItem {
	key: NavRouteKey;
	href: ResolvedPathname;
	label: string;
}
export interface VisibleNavSection {
	title?: string;
	items: VisibleNavItem[];
}
export function visibleNav(caps: Capabilities | null | undefined): VisibleNavSection[] {
	const entries = Object.entries(NAV_ROUTES) as Array<[NavRouteKey, NavRoute]>;
	return SECTIONS.map((s) => ({
		title: s.title,
		items: entries
			.filter(([, r]) => r.section === s.id && !r.hidden && canSee(caps, r))
			.map(([key, r]) => ({ key, href: r.href, label: r.label }))
	})).filter((s) => s.items.length > 0);
}

/** The nav route guarding `pathname` (longest href prefix), or null. */
export function routeForPath(pathname: string): NavRoute | null {
	let best: NavRoute | null = null;
	for (const r of Object.values(NAV_ROUTES) as NavRoute[]) {
		if (
			(pathname === r.href || pathname.startsWith(`${r.href}/`)) &&
			(!best || r.href.length > best.href.length)
		)
			best = r;
	}
	return best;
}
```

```ts
// src/lib/config/nav-icons.ts — client renderers only
import {
	Boxes,
	Building2,
	FileText,
	Inbox,
	LayoutDashboard,
	Search,
	Settings,
	ShieldCheck,
	ShoppingCart,
	Users,
	type LucideIcon
} from '#lib/icons/index.ts';
import type { NavRouteKey } from './nav.ts';
export const NAV_ICONS: Record<NavRouteKey, LucideIcon> = {
	dashboard: LayoutDashboard,
	tenants: Building2,
	persons: Search,
	tenantSettings: Settings,
	team: Users,
	roles: ShieldCheck,
	leads: Users,
	orders: ShoppingCart,
	quotations: FileText,
	inventory: Boxes,
	permissionRequests: Inbox,
	account: ShieldCheck
};
```

If `FileText` is not in `#lib/icons/index.ts`, add the re-export there.

Changes in consumers:

- `session.svelte.ts`: add `readonly capabilities: Capabilities | null` (from `page.data.capabilities`) and `can(permission: string | readonly string[]): boolean` (`any-of` via `hasCapability`).
- `auth/index.ts` exports `P`, `type Permission`, `isPlatformCaller`, `canAccess`, `anyOf`, `AUTHENTICATED`, `type AccessRule`.
- `Sidebar.svelte`: delete the inline `tier` block. Use `const sections = $derived(visibleNav(session.capabilities))` and render each item's icon with `NAV_ICONS[item.key]`.
- `routeTitle.ts`: `ALL_ITEMS = Object.entries(NAV_ROUTES).map(([key, r]) => ({ href: r.href, label: r.label, icon: NAV_ICONS[key as NavRouteKey] }))`.
- `CommandPalette.svelte`: add a "Pages" group first, `pages = visibleNav(session.capabilities).flatMap((s) => s.items).filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase()))`, each a link with `resolve`. Pass the omni-search query `() => (isPlatformCaller(session.capabilities) ? q : '')` so `/v1/search` (RequirePlatform) is never called for tenant users.
- `Topbar.svelte`: `canSearch = $derived(session.isAuthenticated)`.

Phase 2's HorizontalNav must render `visibleNav` too. State this in `nav.ts`'s module doc.

- [ ] **Step 1: Write failing tests**
  - `tier.test.ts`: super user without platform → `hasCapability(…, 'platform.tenants.view') === false`; platform caller on tenant slug `acme` → false; `tenant.admin` grants `identity.users.view` but not `crm.leads.read`; super user grants `crm.leads.read`; `deriveTier` cases.
  - `nav.test.ts`: tenant user with `crm.leads.read` sees `/leads` but not `/orders`; platform super sees no CRM section; `routeForPath('/orders/quotations/x')?.href === '/orders/quotations'`; `routeForPath('/leads/abc')?.href === '/leads'`.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement as above.
- [ ] **Step 4:** Run the gates. Run `CI=1 npx playwright test tests/e2e/role-aware-shell.spec.ts tests/e2e/cmd-k-search.spec.ts --project=chromium --retries=0`. Sidebar expectations now depend on permissions: give the tenant-admin fixture `tenant.admin` and the CRM permissions its test needs.
- [ ] **Step 5:** Commit `feat(authz): Go-accurate permission semantics; one nav config drives sidebar, palette and titles`.

---

### Task 12: Server route guards (any-of), tenant settings actions, identity button gating

**Files to modify**

- `src/lib/server/guards.ts`: add `requireRouteAccess`, `guardRoute`; extend `guardPage` to `string | readonly string[]` (any-of); keep `requireCapability`, `hasRequiredCapability` and `OPERATOR_SCOPE_PERMISSION` unchanged.
- `src/routes/(app)/settings/tenant/+layout.server.ts`
- `src/routes/(app)/settings/tenant/_actions.ts`: `patchTenant` gains a `permission` option; `pathSuffix` becomes `section: 'profile' | 'statutory' | 'admin-contact' | 'settings' | 'display-preferences'`.
- The five `src/routes/(app)/settings/tenant/*/+page.server.ts` files
- Existing `guardPage('…')` loads at `settings/users`, `users/[id]`, `users/hierarchy`, `settings/roles`, `roles/[id]`, `operator/tenants`, `operator/persons`, `persons/[id]`
- Identity components: `UsersList.svelte`, `UserDetailTabs.svelte`, `RolesList.svelte`, `routes/(app)/settings/users/[id]/+page.svelte`, `TenantsList.svelte`, `TenantActionPanel.svelte`, `PersonDetail.svelte`

**Create** (one line each: `export const load = guardRoute('<href>');`)

- `src/routes/(app)/leads/+layout.server.ts`
- `src/routes/(app)/orders/+layout.server.ts`
- `src/routes/(app)/inventory/+layout.server.ts`
- `src/routes/(app)/permission-requests/+layout.server.ts`

**Tests:** `tests/unit/server/guards.test.ts` (add cases), `tests/unit/server/tenant-settings-actions.test.ts` (add 403 case), `tests/e2e/server-capability-guards.spec.ts` (add /leads, /orders, /inventory cases)

```ts
// additions to src/lib/server/guards.ts
import { canAccess, hasCapability, type Capabilities } from '#lib/features/auth/capabilities.ts';
import { canSee, routeForPath } from '#lib/config/nav.ts';

/** Nav-level guard: the rule for `href` comes from nav.ts (the single config). */
export function requireRouteAccess(caps: Capabilities | null | undefined, href: string): void {
	const route = routeForPath(href);
	if (!route) throw new Error(`nav.ts has no route guarding ${href}`);
	if (!canSee(caps, route)) redirect(303, '/dashboard');
}
export function guardRoute(href: string) {
	return async ({
		parent
	}: {
		parent: () => Promise<{ capabilities?: Capabilities }>;
	}): Promise<void> => {
		requireRouteAccess((await parent()).capabilities, href);
	};
}
/** Page-specific stricter permission (e.g. roles/new, orders/[id]); any-of when given a list. */
export function guardPage(permission: string | readonly string[]) {
	const any = typeof permission === 'string' ? [permission] : permission;
	return async ({
		parent
	}: {
		parent: () => Promise<{ capabilities?: Capabilities }>;
	}): Promise<void> => {
		const caps = (await parent()).capabilities;
		if (!any.some((p) => hasCapability(caps, p))) redirect(303, '/dashboard');
	};
}
```

**Rule:** a nav-level route uses `guardRoute(href)`. A sub-page with its own stricter permission uses `guardPage(P.x)` (`settings/roles/new` → `P.identityRolesCreate`; `orders/[id]` → `P.ordersOrdersRead`, added in Task 21).

- Replace `guardPage('identity.users.view')` in the three users routes with `guardRoute('/settings/users')`.
- Roles list and detail use `guardRoute('/settings/roles')`.
- Operator tenants uses `guardRoute('/operator/tenants')`; both persons routes use `guardRoute('/operator/persons')`.
- `operator/scope/+layout.server.ts` switches to `requireRouteAccess(caps, '/operator/tenants')`. `OPERATOR_SCOPE_PERMISSION` stays for `/api/operator/scope`.

**Tenant settings**

- `+layout.server.ts` calls `requireRouteAccess((await parent()).capabilities, '/settings/tenant')` before the fetch.
- `patchTenant({ cookies, section, schema, payload, permission })`:
  1. `const caps = await loadCapabilities(cookies)`
  2. `if (!hasRequiredCapability(caps, permission)) return fail(403, { values: payload, bannerError: "You don't have permission to change these settings." })`
  3. PATCH `/v1/tenants/${tenantId}/${section}`
- Permissions: profile, statutory, admin-contact → `P.identityTenantsUpdate`; settings (security tab), display-preferences → `P.identityTenantsUpdateSettings`.
- If the other engineer has already added a check, align its strings to these and keep one check.

**Identity action-button gating** (intended Go permissions, checklist table; `session.can(...)`):

| Button                           | Permission                       |
| -------------------------------- | -------------------------------- |
| Add member                       | `identityUsersCreate`            |
| Deactivate                       | `identityUsersDeactivate`        |
| Reactivate                       | `identityUsersReactivate`        |
| Assign role                      | `identityRolesAssign`            |
| Revoke role                      | `identityRolesRevoke`            |
| Permission overrides             | `identityUsersUpdatePermissions` |
| Manager set/remove, profile edit | `identityUsersUpdate`            |
| New role                         | `identityRolesCreate`            |
| Edit role / set parent           | `identityRolesUpdate`            |
| Delete role                      | `identityRolesDelete`            |

Operator actions:

- `TenantsList` / `TenantActionPanel` keep `platform.tenants.*`; they resolve to `isPlatformCaller`.
- `PersonDetail` anonymise switches from `identity.users.anonymise` to `P.platformUsersManage`. Go gates `/platform/persons/{id}/anonymise` with `RequirePlatform` only (`http.go:199`); the old check hid the button from platform staff.

- [ ] **Step 1:** Write failing tests:
  - `guardRoute('/leads')` redirects without `crm.leads.read` and passes with it
  - a platform caller is redirected from `/leads` (audience)
  - `guardPage([a, b])` passes with `b` only
  - `patchTenant` returns 403 without `identity.tenants.update` (mock `loadCapabilities`)
  - e2e: a tenant user without CRM permissions visiting `/leads` lands on `/dashboard`
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement as above.
- [ ] **Step 4:** Run the gates and `server-capability-guards.spec.ts` plus `tenant-settings.spec.ts`.
- [ ] **Step 5:** Commit `feat(authz): server guards from nav.ts for leads/orders/inventory/permission-requests/tenant settings; action buttons gated`.

---

### Task 13: `utils/format.ts` and `utils/status.ts` (catalogue #17, #18)

**Files**

- Create: `src/lib/utils/format.ts`, `src/lib/utils/status.ts`
- Tests: `tests/unit/utils/format.test.ts`, `tests/unit/utils/status.test.ts`
- Migrate now (identity files that survive the re-contract):
  - `auth/view-models.ts` (`lastSeenLabel` becomes `relativeTime`; delete `lastSeenLabel`)
  - `tenant/view-models.ts` and `operator/tenants/view-models.ts` (one `tenantStatus` map: drift #5)
  - `users/view-models.ts` (`userStatusBadge`)
  - `operator/people/view-models.ts` (`personLifecycleBadge`)
  - `permission-requests/view-models.ts` (`stateBadge`)
  - `roles/view-models.ts` (`roleBadgeVariant`)
  - inline `toLocale*` in identity components, listed by `grep -rnE "toLocale(Date|Time)?String" src/lib/features/{auth,users,roles,tenant,permission-requests,operator} src/routes`
- **Not migrated here:** occurrences in files that Tasks 17, 21, 25 and 27 rewrite (leads, orders and inventory view-models; ActivityTimeline). Those tasks use these helpers. `displayName` and `initials` already live in `src/lib/utils/person-name.ts` (catalogue #17 is satisfied there; do not move them).

```ts
// src/lib/utils/format.ts
const LOCALE = 'en-IN';
const money = new Intl.NumberFormat(LOCALE, {
	style: 'currency',
	currency: 'INR',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});
const dateFmt = new Intl.DateTimeFormat(LOCALE, {
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit'
});
const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/** Integer paise (Go *_paise) → "₹12,345.00". */
export function formatMoney(paise: number | null | undefined): string {
	return paise == null || !Number.isFinite(paise) ? '—' : money.format(paise / 100);
}
/** User input in rupees ("1,234.5", "₹10") → integer paise; null when not a non-negative amount with ≤ 2 decimals. */
export function parseMoneyInput(input: string): number | null {
	const cleaned = input.replace(/[₹,\s]/g, '');
	if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
	const [rupees, fraction = ''] = cleaned.split('.');
	return Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
}
export const paiseToRupeeInput = (paise: number): string => (paise / 100).toFixed(2);
/** Go GST basis points (1200) → "12%". */
export function formatBps(bps: number | null | undefined): string {
	return bps == null ? '—' : `${(bps / 100).toLocaleString(LOCALE, { maximumFractionDigits: 2 })}%`;
}
export function percentToBps(input: string): number | null {
	const n = Number(input);
	return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) : null;
}
/** RFC 3339 or date-only ("2026-11-18", read as a LOCAL date, not UTC midnight). */
export function parseApiDate(value: string | null | undefined): Date | null {
	if (!value) return null;
	const d0 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	const d = d0 ? new Date(Number(d0[1]), Number(d0[2]) - 1, Number(d0[3])) : new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}
export const formatDate = (v: string | null | undefined): string => {
	const d = parseApiDate(v);
	return d ? dateFmt.format(d) : '—';
};
export const formatDateTime = (v: string | null | undefined): string => {
	const d = parseApiDate(v);
	return d ? dateTimeFmt.format(d) : '—';
};
/** Date → RFC 3339 for Go request bodies. */
export const toApiDateTime = (d: Date): string => d.toISOString();
export function relativeTime(v: string | null | undefined, now: Date = new Date()): string {
	const d = parseApiDate(v);
	if (!d) return '—';
	const diff = d.getTime() - now.getTime();
	const abs = Math.abs(diff) / 1000;
	if (abs < 45) return 'just now';
	const sign = diff >= 0 ? 1 : -1;
	if (abs < 3600) return rtf.format(sign * Math.round(abs / 60), 'minute');
	if (abs < 86_400) return rtf.format(sign * Math.round(abs / 3600), 'hour');
	if (abs < 30 * 86_400) return rtf.format(sign * Math.round(abs / 86_400), 'day');
	return dateFmt.format(d);
}
export const shortId = (id: string | null | undefined): string => (id ? `${id.slice(0, 8)}…` : '—');
```

```ts
// src/lib/utils/status.ts
export type StatusVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';
export interface StatusView {
	label: string;
	variant: StatusVariant;
}
export function humanise(code: string): string {
	const s = code.replace(/[_.-]+/g, ' ').trim();
	return s.charAt(0).toUpperCase() + s.slice(1);
}
/** One status → { label, variant } map per enum; unknown values render humanised + neutral (never crash on a new Go value). */
export function defineStatusMap<K extends string>(
	map: Record<K, StatusView>,
	fallback: StatusVariant = 'neutral'
) {
	return (value: string | null | undefined): StatusView =>
		value != null && Object.hasOwn(map, value)
			? map[value as K]
			: { label: value ? humanise(value) : '—', variant: fallback };
}
```

Example migration: `tenant/view-models.ts` exports

```ts
export const tenantStatus = defineStatusMap<TenantStatus>({
	pending: { label: 'Pending', variant: 'info' },
	active: { label: 'Active', variant: 'success' },
	suspended: { label: 'Suspended', variant: 'warning' },
	pending_deletion: { label: 'Pending deletion', variant: 'danger' },
	deleted: { label: 'Deleted', variant: 'neutral' }
});
```

`tenantStatusBadge` and `tenantLifecycleBadge` are deleted and their callers use `tenantStatus(t.status)`. Do the same for the others:

- `userStatus`: active → success, inactive → neutral
- `permissionRequestState`: pending, approved, denied, cancelled
- `personLifecycle`: key derived by `personLifecycleKey(p): 'anonymised' | 'suspended' | 'inactive' | 'active'`
- `roleKind`: super_admin / system / custom

The badge variant type in each feature points at `StatusVariant`.

- [ ] **Step 1:** Write failing tests:
  - `formatMoney(1234500) === '₹12,345.00'`, `formatMoney(1000) === '₹10.00'` (drift #6)
  - `parseMoneyInput('1,234.5') === 123450`, `parseMoneyInput('1.234') === null`
  - `formatBps(1200) === '12%'`
  - `parseApiDate('2026-11-18')?.getDate() === 18` (local)
  - `relativeTime` past and future cases
  - `defineStatusMap` fallback humanises `'pending_deletion'` → `'Pending deletion'`
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement the helpers and the identity migrations. Update the view-model tests that asserted the old badge function names.
- [ ] **Step 4:** Run the gates.
- [ ] **Step 5:** Commit `refactor(ui): utils/format (money from paise, dates, relative time) and utils/status; identity view-models migrated`.

---

### Task 14: `describeApiError`, `QueryState`, `DescriptionList` (catalogue #4, #5, #7)

**Files**

- Modify: `src/lib/api/error-messages.ts` (replace `getListErrorMessage` with `describeApiError`)
- Create:
  - `src/lib/components/feedback/QueryState.svelte`
  - `src/lib/components/feedback/index.ts`
  - `src/lib/components/ui/DescriptionList.svelte` (export from `src/lib/components/ui/index.ts`)
- Install `@testing-library/svelte` (devDependency). In `vitest.config.ts` add `svelteTesting()` from `@testing-library/svelte/vite` to `plugins`.
- Tests: `tests/unit/api/error-messages.test.ts`, `tests/unit/components/query-state.test.ts`, `tests/unit/components/description-list.test.ts`
- Migrate now:
  - `getListErrorMessage` callers: TenantsList, PermissionRequestsList, RolesList, UsersList. OrdersList is deleted in Task 20; until then it calls `describeApiError(err, { noun: 'orders' })`.
  - The mutation ladders in `DeactivateUserDialog`, `DeleteRoleDialog`, `SuspendDialog`, `MarkForDeletionDialog`, `GlobalSuspendDialog`, `AnonymiseDialog` are replaced in Task 15 (do not touch them here).
  - Query copies: `routes/(app)/settings/users/[id]/+page.svelte`, `settings/users/hierarchy/+page.svelte`, `settings/account/sessions/+page.svelte`, `PermissionRequestDetail.svelte` switch to `QueryState`. If the other engineer changed `routes/(app)/settings/roles/[id]/+page.svelte`, replace its detail-loading branch the same way.
  - DescriptionList: `ProfileForm` (read-only part), `PermissionRequestDetail`, `UserDetailTabs` (profile tab), `routes/(app)/operator/scope/profile/+page.svelte`.

```ts
// src/lib/api/error-messages.ts
import {
	AuthError,
	ConflictError,
	NetworkError,
	NotFoundError,
	RateLimitError,
	SchemaError,
	ServerError,
	TimeoutError,
	ValidationError,
	ApiError
} from './errors.ts';
export interface DescribeOptions {
	/** Singular noun, lower case: "lead", "order", "team member". */
	noun: string;
	/** Verb for 403 copy; default "view". */
	verb?: string;
	/** Copy for a domain 409 (overrides Go's message). */
	conflict?: string;
}
export function describeApiError(err: unknown, o: DescribeOptions): string | null {
	if (err == null) return null;
	if (err instanceof NetworkError) return 'Check your network connection and try again.';
	if (err instanceof TimeoutError) return 'The server took too long to answer. Try again.';
	if (err instanceof AuthError)
		return err.status === 401
			? 'Your session expired. Sign in again.'
			: `You don't have permission to ${o.verb ?? 'view'} this ${o.noun}.`;
	if (err instanceof NotFoundError) return `This ${o.noun} doesn't exist or was removed.`;
	if (err instanceof ConflictError) return o.conflict ?? err.message;
	if (err instanceof ValidationError || err instanceof RateLimitError || err instanceof SchemaError)
		return err.message;
	if (err instanceof ServerError) return 'Something went wrong on our side. Try again in a moment.';
	if (err instanceof ApiError) return err.message;
	return 'Something went wrong. Please try again.';
}
```

`QueryState.svelte`:

- Props: `query: { isPending; isError; error; data; refetch? }`, `noun: string`, `isEmpty?: (data: T) => boolean`, `children: Snippet<[T]>`, `skeleton?: Snippet`, `empty?: Snippet`.
- Rendering: the skeleton while pending (default: two `Skeleton` bars, `aria-busy="true"`).
- On error, an `Alert`:
  - `NotFoundError` → variant `warning`, title `"<Noun> not found"`
  - `AuthError` 403 → variant `warning`, title `"No access"`
  - otherwise → variant `danger`, title `"Couldn't load <noun>"`, with a "Try again" `Button` calling `query.refetch()`
  - The body is `describeApiError(error, { noun })`.
- `empty` when `isEmpty(data)` (default `EmptyState` with the `Inbox` icon and title `"No <noun> yet"`), otherwise `children(data)`.
- Imports: `#lib/components/ui/index.ts`, `#lib/api/errors.ts`, `#lib/api/error-messages.ts`, `#lib/icons/index.ts`. The `generics="T"` attribute is on `<script lang="ts">`. Distinguishing 404, 403, network and other fixes catalogue drift #4.

`DescriptionList.svelte` (types in `<script module>`):

```svelte
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	export interface DescriptionItem {
		label: string;
		value?: string | number | null;
		mono?: boolean;
		span?: 1 | 2;
		render?: Snippet;
	}
</script>

<script lang="ts">
	let {
		items,
		cols = 2,
		fallback = '—'
	}: { items: readonly DescriptionItem[]; cols?: 1 | 2 | 3; fallback?: string } = $props();
</script>

<dl
	class={['grid grid-cols-1 gap-3', cols >= 2 && 'md:grid-cols-2', cols === 3 && 'lg:grid-cols-3']}
>
	{#each items as item (item.label)}
		<div class={['stack stack-tight', item.span === 2 && 'md:col-span-2']}>
			<dt class="caption text-fg-muted">{item.label}</dt>
			<dd class={['label text-fg', item.mono && 'font-mono']}>
				{#if item.render}{@render item.render()}{:else}{item.value == null || item.value === ''
						? fallback
						: item.value}{/if}
			</dd>
		</div>
	{/each}
</dl>
```

- [ ] **Step 1:** Write failing tests:
  - `describeApiError(new AuthError(403), { noun: 'lead' }) === "You don't have permission to view this lead."`
  - `QueryState` renders "Lead not found" for a `NotFoundError`, children when data is present, and the empty snippet when `isEmpty`
  - `DescriptionList` renders `—` for an empty value
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement and migrate.
- [ ] **Step 4:** Run the gates.
- [ ] **Step 5:** Commit `feat(ui): describeApiError, QueryState (404/403/network told apart), DescriptionList; identity screens migrated`.

---

### Task 15: `TextareaField`, `ReasonConfirmDialog`, `FormDialog`, `FormSheet` (catalogue #1, #2, #11)

**Files**

- Create:
  - `src/lib/components/form/TextareaField.svelte`
  - `src/lib/components/form/FormDialog.svelte`
  - `src/lib/components/form/FormSheet.svelte`
  - `src/lib/components/feedback/ReasonConfirmDialog.svelte`
- Modify:
  - `src/lib/components/form/index.ts`, `src/lib/components/feedback/index.ts` (exports)
  - `src/lib/components/ui/ConfirmDialog.svelte` (add `confirmDisabled?: boolean`)
- Migrate onto `ReasonConfirmDialog` (fixes drift #1, type-to-confirm, and #3): `DeactivateUserDialog`, `DeleteRoleDialog` (type-to-confirm with the role name), `SuspendDialog`, `MarkForDeletionDialog` (type-to-confirm with the tenant slug), `GlobalSuspendDialog`, `AnonymiseDialog` (type-to-confirm with the email). Each file shrinks to the props wrapper; their mutations get `inlineErrors: true`.
- Migrate onto `FormSheet` / `FormDialog` so neither ships with zero users: `CreatePermissionRequestDrawer` (FormSheet), `ImpersonateModal` (FormDialog).
- The other drawers listed in catalogue #1 (`CreateTenantDrawer`, `CreateUserDrawer`, `ManagerSelectorDrawer`, `RoleAssignmentDrawer`, `PermissionOverridesPanel`) are **Phase 2**. Leads, orders and inventory dialogs use these components in Tasks 18–25.
- Tests: `tests/unit/components/reason-confirm-dialog.test.ts`, `tests/unit/components/form-dialog.test.ts`

**Interfaces (stable public API; Phase 2 swaps the internals to superforms without changing these props)**

- `TextareaField`: `{ label; name; value: bindable string; rows?: number = 3; maxlength?: number; hint?; error?; required?; placeholder?; disabled? }`.
  - The id comes from `$props.id()`. `aria-describedby` points at hint, error and counter. The error carries `role="alert"`. A counter `"{n}/{max}"` shows when `maxlength` is set. Built on `ui/textarea`'s `Textarea`.
- `ReasonConfirmDialog`: `{ open: bindable; onOpenChange; title; description?; variant?: ConfirmDialogVariant = 'danger'; confirmLabel; reasonLabel? = 'Reason'; reasonRequired? = true; reasonMaxLength? = 500; confirmText?: string; noun: string; conflict?: string; onConfirm: (reason: string) => Promise<void>; extra?: Snippet }`.
  - Resets on every open.
  - The confirm button is disabled while `reasonRequired && reason.trim() === ''`, or when `confirmText` is set and the typed text differs.
  - On rejection it shows `ValidationError.fields.reason` as the field error, else `describeApiError(err, { noun, verb: confirmLabel.toLowerCase(), conflict })` as the banner.
  - It closes itself on success.
- `FormDialog` / `FormSheet`: `{ open: bindable; onOpenChange; title; description?; submitLabel; submitVariant?: 'primary' | 'danger'; schema: z.ZodObject; initial: () => z.input<S>; onSubmit: (values: z.output<S>) => Promise<void>; fields: Snippet<[Form<S>]>; size?: 'md' | 'lg' }`.
  - Built on `useForm` (Task 2's `reset(next)`): `$effect(() => { if (open) form.reset(initial()); })`.
  - The `<form>` submit calls `form.submit(e, async (v) => { await onSubmit(v); onOpenChange(false); })`. Pass a mutation's `mutateAsync` as `onSubmit`; this replaces `new Promise(... mutate ...)` (catalogue #12).
  - Footer: Cancel (`Dialog.Close`) and Submit (`loading={form.isSubmitting}`). The banner is `form.bannerError` in an `Alert`.
  - `FormSheet` uses `ui/sheet` (right side, `size` → width tokens `max-w-md` / `max-w-2xl`). `FormDialog` uses `ui/dialog`.

- [ ] **Step 1:** Write failing tests (`@testing-library/svelte`):
  - `ReasonConfirmDialog` with `confirmText="acme"`: the confirm button stays disabled until "acme" is typed
  - `onConfirm` rejecting with `new ConflictError('already suspended')` shows that text
  - `FormDialog` re-seeds values on reopen and closes after a successful submit
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement and migrate the eight files listed.
- [ ] **Step 4:** Run the gates. Run `CI=1 npx playwright test tests/e2e/operator-tenant-management.spec.ts tests/e2e/operator-people-management.spec.ts tests/e2e/tenant-user-management.spec.ts tests/e2e/tenant-roles-management.spec.ts tests/e2e/operator-impersonation.spec.ts tests/e2e/permission-requests.spec.ts --project=chromium --retries=0`.
- [ ] **Step 5:** Commit `feat(ui): TextareaField, ReasonConfirmDialog (type-to-confirm blocks), FormDialog/FormSheet; reason dialogs migrated`.

---

### Task 16: Leads 1/4 — delete features with no Go route

**Go routes that exist** (`internal/crm/ports/http.go:86-101`):

- `GET /crm/leads`, `GET /crm/leads/{id}`
- `POST /crm/leads/{id}/assign|stage|temperature|calls|convert|lose|reminders`
- `GET /crm/reminders`
- `POST /crm/reminders/{id}/sent|cancel`

Everything else the web calls is MISSING (contract matrix L3, L5, L7, L8, L10–L14, U11).

**Delete**

- Components: `src/lib/features/leads/components/{EditLeadDrawer,CallLogTimeline,ReassignmentHistory}.svelte`
- `leads/api.ts`: `updateLead`, `listCallLogs`, `listLeadReminders`, `updateReminder`, `listAssignmentHistory`, `bulkLeadAction`, `multipartPost`, `safeJsonParse`, `bulkUploadPreview`, `bulkUploadCommit`, `leadsExportUrl`
- `leads/schemas.ts`: `updateLeadSchema`, `callLogDtoSchema`, `listCallLogsResponseSchema`, `assignmentHistory*`, `bulk*`, `reminderActionSchema`
- `leads/queries.ts`: `updateLeadMutation`, `leadCallsQuery`, `leadRemindersQuery`, `leadHistoryQuery`, `updateReminderMutation`, `bulkLeadActionMutation`, `bulkUpload*Mutation`
- Barrel exports for all of the above

**Interim fix (one line, removed in Task 17):** `changeStageMutation` and `changeTemperatureMutation` keep compiling. Their `mutationFn` calls `apiLegacy.post(\`/v1/crm/leads/${id}/stage\`, { new_stage: stage })`/`…/temperature`, `{ new_temperature }`, returning `void`from new temporary functions`changeStage(id, stage)`and`changeTemperature(id, temperature)`in`api.ts`. `successToast`uses vars; the`undo`for stage is removed (Go moves stages forward only:`crmlead/stage.go:67-77`).

**Page edits, each leaving a `TODO(backend)` comment at the removed entry point**

- `routes/(app)/leads/+page.svelte`:
  - remove the "Bulk upload" `primaryAction`, `BulkUploadDrawerShared`, the `bulk` prop, `createBulkSelection`, `bulkActions`, the `onEdit`/`e` keyboard handler and `onToggleSelect`
  - `// TODO(backend): lead create + bulk upload + bulk actions + CSV export — need POST /crm/leads, /crm/leads/bulk-*, /crm/leads/export (backend-checklist #10)`
- `LeadsTable.svelte`: remove the select-all and row checkbox column; drop the `selection` prop.
- `routes/(app)/leads/[id]/+page.svelte`:
  - remove the Activity and History tabs and `EditLeadDrawer`; the tab list becomes `['profile', 'reminders']`; the reminders tab shows `EmptyState` until Task 18
  - `// TODO(backend): call-log list + assignment history — need GET /crm/leads/{id}/calls and /history (backend-checklist #10)`
- `LeadDetailHeader.svelte`:
  - remove the Edit button: `// TODO(backend): lead edit — needs PATCH /crm/leads/{id} (backend-checklist #10)`
  - the Reassign button stays (Task 18 rewires it)
- `RemindersList.svelte`: remove Snooze, Dismiss and Complete (Task 18 adds Mark sent and Cancel).

**e2e:** in `tests/e2e/leads.spec.ts`, delete the scenarios "selecting two rows surfaces the bulk action bar", "change stage bulk action POSTs …bulk-action", "open drawer → upload CSV …", "tabs visible: … History" (becomes Profile/Reminders) and the call-history deep-link tests. Update the visual CRM spec the same way.

- [ ] **Steps:** (1) Remove each export, starting from the barrel, until `npm run check` is clean. (2) Gates. (3) `CI=1 npx playwright test tests/e2e/leads.spec.ts --project=chromium --retries=0`: the remaining scenarios pass with their old fixtures, because the list still uses the legacy schema. (4) Commit `refactor(leads): remove features with no Go endpoint (edit, bulk, upload, export, call list, history, snooze)`.

---

### Task 17: Leads 2/4 — data layer on Go `LeadDto` and mechanical component update

**Go DTOs** (`internal/crm/ports/dto.go`):

- `LeadDto` (:16-48). Required on the wire: `id`, `tenant_id`, `stage`, `temperature`, `contact_name`, `phone_e164`, `has_drug_licence`, `has_gst`, `gst_verified`, `created_at`. Present when non-zero (`omitzero`): `city`, `district`, `state`, `pincode`, `business_type`, `medicine_system`, `order_value`, `buy_timeline`, `product_ranges`, `dosage_forms`, `extra_profile`, `assignee_membership_id`, `assigned_at`, `source_purchase_id`, `source_platform_lead_id`, `converted_at`, `converted_by_membership_id`, `lost_at`, `lost_by_membership_id`, `lost_reason`, `created_by_membership_id`.
- `ListLeadsResponse` (:52-56) `{items, has_more, next_cursor?}`
- `AssignLeadRequest` (:61-64) `{assignee_membership_id, reason?}`; response 200 `{assignment_id?, assignee_membership_id}` (:68-71, `http.go:244`)
- `ChangeStageRequest` (:74-77) `{new_stage, reason?}` → 204
- `ChangeTemperatureRequest` (:80-82) `{new_temperature}` → 204
- `LogCallRequest` (:85-88) `{outcome, notes?}` → 201 `{call_id}` (`http.go:358`)
- `LoseLeadRequest` (:96-98) `{reason}` → 204; empty reason is 422 `reason_required`
- convert takes no body → 204
- `ReminderDto` (:104-121), `ListRemindersResponse` (:124-128)
- `CreateReminderRequest` (:134-138) `{assigned_to_membership_id, due_at (RFC 3339), notes?}` → 201 `{reminder_id}`
- `CancelReminderRequest` (:147-149) `{reason}`; sent takes no body; both → 204 (`http_reminders.go:234-248`)

Enums:

- stage `new|contacted|interested|negotiation|converted|lost`; forward moves only `new→contacted→interested→negotiation` (`crmlead/stage.go:20-77`); convert and lose from any non-terminal stage (`crmlead.go:590-640`)
- temperature `hot|warm|cold|dead` (`temperature.go:16-19`); not allowed on terminal leads
- business_type `PCD|ThirdParty`, medicine_system `Allopathic|Ayurvedic`, order_value `Below5000|Upto25000|Upto50000|Above50000`, buy_timeline `WithinWeek|Within15Days|WithinMonth` (`taxonomy.go`)
- call outcome `connected|no_answer|busy|wrong_number|not_interested|interested|callback_requested|converted|other` (`calllog.go:58-66`)
- reminder type `callback|mature_lead|manual`, state `pending|sent|cancelled`

List filters (`http.go:428-467`):

- `name`, `stage` (single), `temperature` (single), `assignee` (single UUID; without `crm.leads.read_all` it must equal the caller, or 403 `forbidden`, `http.go:152`), `city`, `pincode` (`^[1-9][0-9]{5}$`), `business_type`, `medicine_system`, `product_range[]`, `dosage_form[]`, plus `cursor` and `page_size`.
- Reminders list (`http_reminders.go:96-147`): `type`, `assignee`, `lead_id`, `cursor`, `page_size`; pending only.

**Files**

- Rewrite: `src/lib/features/leads/{schemas,api,queries,view-models,filter-config,index}.ts`
- Mechanical updates: `LeadsKanban`, `LeadCardKanban`, `LeadsTable`, `LeadDetailHeader`, `LeadProfileCard`, `LeadComplianceCard`, `RemindersList`, `LogCallDialog`, `routes/(app)/leads/+page.svelte`, `routes/(app)/leads/[id]/+page.svelte`
- Tests: `tests/unit/features/leads/{schemas,view-models}.test.ts` (rewrite), `tests/unit/features/leads/api.test.ts` (new)

**Exact web schema**

```ts
// src/lib/features/leads/schemas.ts
import { z } from 'zod';
import {
	CrmLeadDto,
	ListLeadsResponse,
	ReminderDto,
	ListRemindersResponse,
	AssignLeadRequest,
	ChangeStageRequest,
	ChangeTemperatureRequest,
	LogCallRequest,
	LoseLeadRequest,
	CreateReminderRequest,
	CancelReminderRequest
} from '#lib/api/generated/index.ts';

export const leadStageSchema = CrmLeadDto.shape.stage;
export const leadTemperatureSchema = CrmLeadDto.shape.temperature;
export const businessTypeSchema = z.enum(['PCD', 'ThirdParty']);
export const medicineSystemSchema = z.enum(['Allopathic', 'Ayurvedic']);
export const orderValueSchema = z.enum(['Below5000', 'Upto25000', 'Upto50000', 'Above50000']);
export const buyTimelineSchema = z.enum(['WithinWeek', 'Within15Days', 'WithinMonth']);
export const callOutcomeSchema =
	LogCallRequest.shape.outcome.unwrap?.() ??
	z.enum([
		'connected',
		'no_answer',
		'busy',
		'wrong_number',
		'not_interested',
		'interested',
		'callback_requested',
		'converted',
		'other'
	]);
export const reminderTypeSchema = ReminderDto.shape.type;
export const reminderStateSchema = ReminderDto.shape.state;

export const leadSchema = CrmLeadDto.extend({
	product_ranges: z.array(z.string()).default([]),
	dosage_forms: z.array(z.string()).default([]),
	extra_profile: z.record(z.string(), z.unknown()).default({})
});
export const leadListSchema = ListLeadsResponse.extend({ items: z.array(leadSchema) });
export const reminderSchema = ReminderDto;
export const reminderListSchema = ListRemindersResponse.extend({ items: z.array(reminderSchema) });

export const assignLeadSchema = AssignLeadRequest.extend({
	assignee_membership_id: z.string().uuid('Pick a team member'),
	reason: z.string().max(500).optional()
});
export const logCallSchema = LogCallRequest.extend({
	outcome: callOutcomeSchema,
	notes: z.string().max(2000).optional()
});
export const loseLeadSchema = LoseLeadRequest.extend({
	reason: z.string().trim().min(1, 'A reason is required').max(500)
});
/** due_at is a datetime-local string in the form; the gateway converts it to RFC 3339. */
export const createReminderFormSchema = z.object({
	assigned_to_membership_id: z.string().uuid('Pick who is reminded'),
	due_at_local: z.string().min(1, 'Pick a date and time'),
	notes: z.string().max(1000).optional()
});

export type Lead = z.output<typeof leadSchema>;
export type LeadStage = z.output<typeof leadStageSchema>;
export type LeadTemperature = z.output<typeof leadTemperatureSchema>;
export type BusinessType = z.output<typeof businessTypeSchema>;
export type MedicineSystem = z.output<typeof medicineSystemSchema>;
export type CallOutcome = z.output<typeof callOutcomeSchema>;
export type Reminder = z.output<typeof reminderSchema>;
export type ReminderType = z.output<typeof reminderTypeSchema>;
export type AssignLeadRequestBody = z.output<typeof AssignLeadRequest>;
export type CreateReminderBody = z.output<typeof CreateReminderRequest>;
export type CancelReminderBody = z.output<typeof CancelReminderRequest>;
export type ChangeStageBody = z.output<typeof ChangeStageRequest>;
export type ChangeTemperatureBody = z.output<typeof ChangeTemperatureRequest>;

/** Go list filters (crm/ports/http.go:428-467). */
export interface LeadListFilters {
	name?: string;
	stage?: LeadStage;
	temperature?: LeadTemperature;
	assignee?: string;
	city?: string;
	pincode?: string;
	business_type?: BusinessType;
	medicine_system?: MedicineSystem;
}
export interface ReminderListFilters {
	lead_id?: string;
	assignee?: string;
	type?: ReminderType;
}
```

Use whichever of `LogCallRequest.shape.outcome` (if the generated schema is an enum) or the literal enum compiles. Write the literal `z.enum([...])` if `.shape.outcome` is `z.string()`. Check `openapi.yaml:4014-4022`.

**Gateway signatures** (`src/lib/features/leads/api.ts`; module header lists the hidden features with their `TODO(backend)` checklist refs)

```ts
export async function listLeads(
	filters: LeadListFilters,
	page: CursorParams,
	signal?: AbortSignal
): Promise<Page<Lead>>;
// api.get('/v1/crm/leads', leadListSchema, { query: { ...filters, ...cursorQuery(page) }, signal }) → toPage(r, 'items')
export function getLead(id: string, signal?: AbortSignal): Promise<Lead>; // GET  /v1/crm/leads/${id}
export function assignLead(id: string, body: AssignLeadRequestBody): Promise<void>; // POST /v1/crm/leads/${id}/assign
export function changeStage(id: string, body: ChangeStageBody): Promise<void>; // POST /v1/crm/leads/${id}/stage
export function changeTemperature(id: string, body: ChangeTemperatureBody): Promise<void>; // POST …/temperature
export function logCall(id: string, body: { outcome: CallOutcome; notes?: string }): Promise<void>; // POST …/calls
export function convertLead(id: string): Promise<void>; // POST …/convert (no body)
export function loseLead(id: string, body: { reason: string }): Promise<void>; // POST …/lose
export function createReminder(leadId: string, body: CreateReminderBody): Promise<void>; // POST …/reminders
export async function listReminders(
	filters: ReminderListFilters,
	page: CursorParams,
	signal?: AbortSignal
): Promise<Page<Reminder>>; // GET /v1/crm/reminders
export function markReminderSent(id: string): Promise<void>; // POST /v1/crm/reminders/${id}/sent
export function cancelReminder(id: string, body: CancelReminderBody): Promise<void>; // POST /v1/crm/reminders/${id}/cancel
```

**Queries** (`queries.ts`)

- Keys: `leadsKeys = { all: ['crm-leads'], lists: () => [...all, 'list'], list: (f) => [...lists(), f], detail: (id) => [...all, 'detail', id], reminders: () => [...all, 'reminders'], reminderList: (f) => [...reminders(), f] }`
- `leadsInfiniteQuery(getFilters: () => LeadListFilters, pageSize = DEFAULT_PAGE_SIZE)`: `createInfiniteList`, `queryFn: ({ cursor, signal }) => api.listLeads(getFilters(), { cursor, page_size: pageSize }, signal)`
- `leadDetailQuery(getId: () => string)`
- `remindersInfiniteQuery(getFilters: () => ReminderListFilters)`
- Mutations, all `createResourceMutation` except stage and temperature:

| Hook                       | Invalidate                  | Toast                  | inlineErrors   |
| -------------------------- | --------------------------- | ---------------------- | -------------- |
| `assignLeadMutation`       | `[detail(id), lists()]`     | 'Lead assigned'        | true           |
| `logCallMutation`          | `[detail(id), reminders()]` | 'Call logged'          | true           |
| `convertLeadMutation`      | `[detail(id), lists()]`     | 'Lead converted'       | (global toast) |
| `loseLeadMutation`         | `[detail(id), lists()]`     | 'Lead marked as lost'  | true           |
| `createReminderMutation`   | `[reminders()]`             | 'Reminder added'       | true           |
| `markReminderSentMutation` | `[reminders()]`             | 'Reminder marked sent' | (global toast) |
| `cancelReminderMutation`   | `[reminders()]`             | 'Reminder cancelled'   | true           |

- `changeStageMutation()` and `changeTemperatureMutation()` keep `useOptimisticMutation` with `mutationFn` → `api.changeStage(id, { new_stage })` / `api.changeTemperature(id, { new_temperature })` (void), the same projection and rollback, and `invalidateKeys: () => [leadsKeys.lists(), [...leadsKeys.all, 'detail']]`.
  - Stage: no `undo`; toast `` `Stage changed to ${stageMeta(stage).label}` ``.
  - Temperature: `undo` calls `api.changeTemperature(id, { new_temperature: previous })` then invalidates `leadsKeys.all`.

**View-models** (pure; `view-models.ts`)

- Keep `STAGE_META`, `STAGE_OPTIONS`, `TEMPERATURE_META`, `TEMPERATURE_OPTIONS`, `stageMeta`, `temperatureMeta`, `groupByStage(leads: Lead[])`.
- `nextStage(stage): LeadStage | null`
- `stageMoveKind(from, to): 'advance' | 'convert' | 'lose' | 'invalid'`. `'advance'` only when `to === nextStage(from)`; `'convert'` / `'lose'` when `to` is converted/lost and `from` is open; otherwise `'invalid'`.
- `isTerminal(stage)`
- `stageOptionsFor(lead): StatusPillOption[]` (current + next + converted + lost while open; current only when terminal)
- `BUSINESS_TYPE_LABEL: Record<BusinessType, string> = { PCD: 'PCD', ThirdParty: 'Third-party' }`, `MEDICINE_SYSTEM_LABEL = { Allopathic, Ayurvedic }`, `ORDER_VALUE_LABEL = { Below5000: 'Below ₹5,000', Upto25000: 'Up to ₹25,000', Upto50000: 'Up to ₹50,000', Above50000: 'Above ₹50,000' }`, `BUY_TIMELINE_LABEL = { WithinWeek: 'Within a week', Within15Days: 'Within 15 days', WithinMonth: 'Within a month' }`
- `labelOf(map, value?: string): string` (`'—'` for absent or `''`)
- `CALL_OUTCOME_LABEL` (9 keys: Connected, No answer, Busy, Wrong number, Not interested, Interested, Callback requested, Converted, Other) and `CALL_OUTCOME_OPTIONS`
- `REMINDER_TYPE_LABEL = { callback: 'Callback', mature_lead: 'Mature lead', manual: 'Manual' }`
- `locationLabel(lead)`: `[city, state]` joined with `', '`, then `' · ' + pincode` when present; `'—'` when all empty
- `assigneeLabel(lead, directory: ReadonlyMap<string, string>)`: 'Unassigned' | name | 'Unknown member'
- `leadExtras(lead): { email?: string; street?: string; gstNumber?: string; panNumber?: string; notes?: string }`. Reads string values of `extra_profile.email|street|gst_number|pan_number|notes` (spec `openapi.yaml:3960-3963` documents these keys).
- `classifyReminder(dueAt, now): 'overdue' | 'today' | 'upcoming'` (local day boundaries via `parseApiDate`)
- Delete `isStale` and the local `relativeTime` (use `#lib/utils/format.ts`).

**`filter-config.ts`**

`LEAD_FILTER_FIELDS`:

- `stage` (select, single)
- `temperature` (select, single)
- `business_type` (select, `BUSINESS_TYPE_LABEL`)
- `medicine_system` (select)
- `city` (text)
- `pincode` (text, placeholder `400001`)

`type LeadUrlFilters = { name?; stage?; temperature?; assignee?; city?; pincode?; business_type?; medicine_system? }` (all strings; `view` is no longer a filter).

`toLeadListFilters(f: LeadUrlFilters): LeadListFilters` drops `''` and invalid enum values and keeps `pincode` only when it matches `^[1-9][0-9]{5}$`.

**Mechanical component changes**

| Component                 | Change                                                                                                                                                                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LeadCardKanban`          | `lead.mobile_number` → `lead.phone_e164`; `ORDER_VALUE_BAND_LABEL[lead.order_value_band]` → `labelOf(ORDER_VALUE_LABEL, lead.order_value)`; business badge → `labelOf(BUSINESS_TYPE_LABEL, lead.business_type)`; `locationLabel` unchanged in name                                                 |
| `LeadsTable`              | phone; "Last contacted" column → "Created" (`relativeTime(lead.created_at)`); stale dot removed; `StatusPill` stage options = `stageOptionsFor(lead)`                                                                                                                                              |
| `LeadDetailHeader`        | phone; extras email from `leadExtras(lead).email`; type `Lead`                                                                                                                                                                                                                                     |
| `LeadProfileCard`         | uses `labelOf` for the four taxonomy fields (still `<dl>`; Task 18 moves it to `DescriptionList`)                                                                                                                                                                                                  |
| `LeadComplianceCard`      | GST number and PAN from `leadExtras` (`has_pan` removed: no Go field; PAN row shows the value or "Not provided")                                                                                                                                                                                   |
| `RemindersList`           | type `Reminder`; `REMINDER_TYPE_LABEL[r.type]`; `r.notes`                                                                                                                                                                                                                                          |
| `LogCallDialog`           | outcomes = `CALL_OUTCOME_OPTIONS`; remove the callback datetime and window inputs (Go ignores them: `LogCallRequest` has `outcome`, `notes`)                                                                                                                                                       |
| `leads/+page.svelte`      | `filters` schema per `LeadUrlFilters`; `buildListParams` → `toLeadListFilters(filters.filters)`; the search box writes `name`; saved views: All, Hot (`temperature: 'hot'`), Mine (`assignee: session.capabilities?.membership_id`); delete "Overdue followup" (multi-stage; Go reads one `stage`) |
| `leads/[id]/+page.svelte` | `leadDetailQuery(() => id)`; reminders tab uses `remindersInfiniteQuery(() => ({ lead_id: id }))`                                                                                                                                                                                                  |

**e2e (same commit):**

- `makeLead()` in `tests/e2e/leads.spec.ts` becomes Go-shaped: `phone_e164: '+919876543210'`, flat `city/district/state/pincode`, `business_type: 'PCD'`, `medicine_system: 'Allopathic'`, `order_value: 'Upto25000'`, `buy_timeline: 'Within15Days'`, `assignee_membership_id: OWNER_MEMBERSHIP`, `extra_profile: { gst_number: '27AAAAA0000A1Z5', email: 'contact@maheshpharma.in' }`. Remove `platform_lead_id`, `purchased_at`, `mobile_number`, `address`, `has_pan`, `owner_membership_id`, `updated_at`, `last_contacted_at`, `next_followup_at`, `notes`.
- Stage and temperature scenarios assert `POST /api/v1/crm/leads/<id>/stage` with body `{"new_stage":"contacted"}` and fixture `status: 204`.
- The filter scenario asserts `listMockCalls()` contains `query` with `stage=interested&page_size=50`.

- [ ] **Steps:**
  1. Write failing unit tests:
     - `leadSchema` parses a minimal Go lead (required fields only) and defaults arrays
     - `stageMoveKind('new', 'interested') === 'invalid'`, `('new', 'lost') === 'lose'`
     - `leadExtras` reads `extra_profile`
     - `toLeadListFilters` drops a bad pincode
     - `api.test`: `listLeads` sends `name`, `stage` and `page_size`; `logCall` resolves on 201
  2. Run (fail).
  3. Implement.
  4. Gates + `leads.spec.ts`.
  5. Commit `feat(leads): Go LeadDto contract — schemas from generated Zod, real endpoints, cursor list, view-models`.

---

### Task 18: Leads 3/4 — behaviours (assign, reminders, lose/convert, kanban rules, filters, shared pieces)

**Files**

- Create:
  - `src/lib/features/users/components/MembershipPicker.svelte` (catalogue #23; export from the users barrel)
  - `src/lib/features/leads/components/{AssignLeadDialog,CreateReminderDialog}.svelte`
- Delete: `src/lib/features/leads/components/ReassignDialog.svelte`; `users/api.ts` `searchMemberships`; `users/schemas.ts` `membershipSearchResultSchema` and `searchMembershipsResponseSchema`; `users/queries.ts` `membershipSearchQuery`
- Modify:
  - `LeadsKanban`, `LeadsTable`, `LeadDetailHeader`, `LeadProfileCard`, `LeadComplianceCard`, `RemindersList`, `LogCallDialog`
  - `routes/(app)/leads/+page.svelte`, `routes/(app)/leads/[id]/+page.svelte`
  - `src/lib/features/users/view-models.ts` (add `membershipDirectory`)

**Interfaces**

- `membershipDirectory(users: readonly UserDto[]): Map<string, string>` (membership_id → `displayName(user)`) in users view-models.
- `MembershipPicker`: `{ label; value: bindable string; error?; hint?; required?; excludeIds?: readonly string[] }`. It uses `usersListQuery()` (all active users, Task 5) and a `Combobox` with client-side filtering over name and email. Emptystate: 'No active member matches'. On query error it shows `describeApiError(err, { noun: 'team list' })` as the hint.
  - Replaces `/v1/identity/memberships` (MISSING, matrix U11): `// TODO(backend): server-side member search — GET /v1/users has no q filter (backend-checklist #10)`.
- `AssignLeadDialog`: `FormDialog` with `assignLeadSchema`; fields `MembershipPicker` and `TextareaField` reason; `onSubmit = (v) => assignMut.mutateAsync({ id: lead.id, body: v })`.
- `CreateReminderDialog`: `FormDialog` with `createReminderFormSchema`; fields `MembershipPicker` (default: lead assignee or self), `<input type="datetime-local">` via `TextField type="datetime-local"`, `TextareaField` notes. `onSubmit` converts `due_at_local` with `toApiDateTime(new Date(v.due_at_local))`.
- `LogCallDialog`: rewrite on `FormDialog` with `logCallSchema`; `Select` outcome, `TextareaField` notes.
- Lose: `ReasonConfirmDialog` (title 'Mark lead as lost', `confirmLabel` 'Mark lost', noun 'lead', `onConfirm = (reason) => loseMut.mutateAsync({ id, reason })`).
- Convert: `ConfirmDialog` (title 'Convert lead', description 'Converting closes the lead. It cannot be reopened.', `confirmLabel` 'Convert').
- Cancel reminder: `ReasonConfirmDialog` (`confirmLabel` 'Cancel reminder', `reasonRequired` true: Go 422 `reason_required`).

**Behaviour per component**

| Component                                | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LeadsKanban`                            | `onCardMove(cardId, from, to)`: `advance` → `changeStageMutation`; `convert` → open the Convert confirm for that lead; `lose` → open the Lose dialog; `invalid` → `toast.error('Leads move one stage at a time (New → Contacted → Interested → Negotiation).')` with no request. Drag is disabled when `!session.can(P.crmLeadsManage)` (pass `ariaLabel` only and ignore moves). A "Load more" `Button` shows when `list.hasNextPage` (kanban groups only loaded leads; page size 100). Error and empty states use `QueryState` with `query={list.query}`, noun 'leads' and `isEmpty={() => list.items.length === 0}`. |
| `LeadsTable`                             | Stage pill: same `stageMoveKind` routing. Temperature pill is interactive only when `can(crmLeadsManage) && !isTerminal`. New "Assignee" column: `assigneeLabel(lead, directory)`.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `LeadDetailHeader`                       | Buttons, each gated: "Log call" (`crmLeadsManage`, open), "Add reminder" (`crmLeadsManage`), "Assign" (`crmLeadsAssign`, open), "Convert" (`crmLeadsManage`, open), "Mark lost" (`crmLeadsManage`, open). Terminal leads show an `Alert` (converted on `formatDate(converted_at)`, or lost on `formatDate(lost_at)`: `lost_reason`).                                                                                                                                                                                                                                                                                    |
| `LeadProfileCard` / `LeadComplianceCard` | Bodies become `DescriptionList` items. A third card "Assignment" shows assignee name, `formatDateTime(assigned_at)`, and "Source" (`source_platform_lead_id` as `shortId`, mono).                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `RemindersList`                          | Props `{ list: InfiniteList<Reminder>; showLead: boolean }`. Grouped Overdue / Today / Upcoming via `classifyReminder`. Row actions "Mark sent" (`markReminderSentMutation`) and "Cancel" (reason dialog), gated on `crmLeadsManage`. When `showLead`, a link "Open lead" → `resolve('/(app)/leads/[id]', { id: r.lead_id })`. Body wrapped in `QueryState`.                                                                                                                                                                                                                                                            |
| `leads/+page.svelte`                     | View tabs via `useUrlTab('kanban', ['kanban', 'table', 'reminders'])`. The "reminders" view renders `RemindersList` with `remindersInfiniteQuery(() => ({}))` and `showLead`: the cross-lead list, Go returns the caller's pending reminders, or all with `crm.leads.read_all`. Assignee filter: when `session.can(P.crmLeadsReadAll)`, a `MembershipPicker` bound to `assignee`; otherwise only the "Mine" saved view sets it (Go 403s a foreign assignee).                                                                                                                                                            |
| `leads/[id]/+page.svelte`                | `QueryState` for the detail (noun 'lead'). Dialogs mounted once. Reminders tab with `showLead=false` and an "Add reminder" button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Product range and dosage form filters (Go-supported multi-value) are **not offered**: there is no option catalogue endpoint. See open question 3.

- [ ] **Steps:**
  1. Write failing tests: `membershipDirectory` maps ids to names; e2e "assign" picks from `GET /api/v1/users` and POSTs `/assign` with `assignee_membership_id`.
  2. Run (fail).
  3. Implement.
  4. Gates + `leads.spec.ts`.
  5. Commit `feat(leads): assign via the team list, reminders (create/sent/cancel, cross-lead view), convert/lose, Go stage rules on kanban`.

---

### Task 19: Leads 4/4 — e2e rewrite and validation on for `/crm/`

**Files:** `tests/e2e/leads.spec.ts` (complete rewrite against the scenarios below), `tests/visual/routes/crm.visual.spec.ts` (fixtures), `tests/a11y/routes.spec.ts` (leads fixtures), `tests/e2e/helpers/contract.ts` (delete the `/crm/` and `/identity/` lines from `UNVALIDATED_PATHS`)

Permissions used: `LEAD_PERMS = ['crm.leads.read', 'crm.leads.manage', 'crm.leads.assign']`. The fixtures are generated-schema-valid (RFC UUIDs `00000000-0000-4000-8000-…`).

**Scenarios**

1. Nav shows Leads with `crm.leads.read`; without it there is no link, and `/leads` lands on `/dashboard`.
2. Kanban renders 6 columns; a card shows `+919876543210` and `Mumbai, Maharashtra · 400001`.
3. Keyboard move `new → contacted` POSTs `/stage {"new_stage":"contacted"}` (204), then toasts and refetches.
4. Move `new → negotiation` shows the one-stage toast and makes no POST (`listMockCalls` has no `/stage`).
5. Move to Lost opens the reason dialog. Confirm is disabled until a reason is typed, then POSTs `/lose {"reason":…}`.
6. Table view shows the Assignee name from the `GET /api/v1/users` fixture; an inline temperature change POSTs `/temperature`.
7. Filters: stage `interested` gives URL `?stage=interested` and a Go query containing `stage=interested`. Search "mah" sends `name=mah`. Pincode `400001` sends `pincode=400001`.
8. Saved view Mine sends `assignee=<TEST_MEMBERSHIP_ID>`; All clears every filter.
9. Detail shows the Profile, Compliance and Assignment cards (GSTIN from `extra_profile`).
10. Log call: the outcome list has exactly the 9 Go outcomes; submit `callback_requested` POSTs `/calls` (fixture 201 `{call_id}`); the dialog closes and no error toast appears.
11. Assign: POSTs `/assign {"assignee_membership_id":…}` (fixture 200 `{assignee_membership_id}`); `listMockCalls` has no `/identity/memberships`.
12. Add reminder POSTs `/leads/<id>/reminders` with an RFC 3339 `due_at` (201 `{reminder_id}`); Mark sent POSTs `/crm/reminders/<id>/sent` (204); Cancel requires a reason.
13. `?view=reminders` GETs `/api/v1/crm/reminders` and the rows link to the lead.
14. A read-only user (`crm.leads.read` only) sees no Log call, Assign, Convert or Mark lost; the pills are not interactive.
15. Removed features are absent: no "Bulk upload", no "Edit", no History or Activity tab.
16. Errors:
    - 409 `{error: 'lead_terminal'}` on `/stage` → error toast and rollback
    - 403 on `GET /crm/leads` → `QueryState` "No access"

- [ ] **Steps:**
  1. Delete the two `UNVALIDATED_PATHS` lines (the suite now fails on any non-Go fixture).
  2. Rewrite the spec.
  3. `CI=1 npx playwright test tests/e2e/leads.spec.ts --project=chromium --retries=0` passes.
  4. Run the a11y project for the leads routes; visual baselines regenerate through `visual-refresh` (Task 32).
  5. Gates.
  6. Commit `test(leads): e2e on Go-shaped, contract-validated fixtures`.

---

### Task 20: Orders 1/4 — delete features with no Go route

**Go routes that exist** (`internal/orders/ports/http.go:73-89`):

- `POST /orders/quotations`; `GET /orders/quotations/{id}`; `POST …/{id}/revise|approve|reject`
- `GET /orders/orders/{id}`; `POST …/{id}/token-payment|confirm|pack|invoice|cancel|complete|credit-notes`
- `GET …/{id}/invoice|payments`; `POST …/{id}/payments`

There are **no list endpoints** for orders or quotations. No revisions, no order PATCH/DELETE, no credit-note list or read, no bulk, and no dispatch/delivered in the orders module (matrix O1, O3, O6, O8, O9, O16, O17, O20, O21).

**Delete**

- Components: `OrdersList.svelte`, `OrderFilters.svelte`, `QuotationRevisionsTimeline.svelte`, `CreditNotesList.svelte`, `DispatchDialog.svelte`, `OrderLifecycleStepper.svelte` (rebuilt in Task 21 from Go states)
- `api.ts`: `listOrders`, `getOrderRevisions`, `getOrderCreditNotes`, `updateOrder`, `deleteOrder`, `dispatchOrder`, `markDelivered`, `bulkOrderAction`, `getCreditNote`
- `queries.ts`: `ordersInfiniteQuery`, `orderRevisionsQuery`, `orderCreditNotesQuery`, `dispatchOrderMutation`, `markDeliveredMutation`, `bulkOrderActionMutation`
- The matching schemas and barrel exports

**Edits**

- `routes/(app)/orders/+page.svelte`: renders the landing `EmptyState` described in Task 21 (built now, inline):

  ```svelte
  <EmptyState
  	icon={ShoppingCart}
  	title="Order and quotation lists aren't available yet"
  	description="Open a quotation from its lead (Leads → a lead → Create quotation). An order opens from its approved quotation."
  />
  ```

  plus a "Go to leads" `Button href` when `session.can(P.crmLeadsRead)`, and `// TODO(backend): order + quotation lists — need GET /orders/orders and GET /orders/quotations (backend-checklist #10)`.

- `OrderDetail.svelte`: remove the Revisions, Credit Notes and Activity tabs and the dispatch dialog. Tabs become `['items', 'payments', 'invoice']`.
- `OrderActionButtons.svelte`: remove the dispatch and mark-delivered buttons.

**e2e:** in `orders.spec.ts`, delete "list renders fixture orders …", "select drafts → Delete drafts …", the revision timeline asserts, "dispatch dialog …" and "mark-delivered …". "nav → /orders renders empty state" now asserts the new copy and that no `GET /api/v1/orders` call was made.

- [ ] **Steps:** (1) remove; (2) gates; (3) `orders.spec.ts`; (4) commit `refactor(orders): remove list, revisions, credit-note list, bulk, edit/delete — no Go endpoints`.

---

### Task 21: Orders 2/4 — `dispatch` feature, orders data layer, order detail on the Go DTO

**Go DTOs**

`internal/orders/ports/dto.go`:

- `LineItemDto` (:15-23) `{product_id, sku, description?, quantity int32, unit_mrp_paise?, unit_sale_paise, gst_rate_bps}`
- `QuotationDto` (:56-65) `{id, tenant_id, customer_lead_id, state: draft|approved|rejected, revision_number, items, rejection_reason?, created_at}`
- `OrderDto` (:70-91) `{id, tenant_id, approved_quotation_id, customer_lead_id, state, items, subtotal_paise, tax_paise, grand_total_paise, invoice_id?, consignment_note_id?, confirmed_at?, packed_at?, invoiced_at?, dispatched_at?, delivered_at?, completed_at?, cancelled_at?, cancellation_reason?, created_at}`
- `RecordTokenPaymentRequest` (:94-99) `{method, amount_paise, external_reference?, notes?}` → 204 (`helpers.go:120`)
- `PackOrderRequest` (:102-107) `{carrier_name, box_count, weight_grams, expected_delivery_at?}` → 204
- `InvoiceOrderResponse` (:110-113) → 200
- `CancelOrderRequest` (:116-118) → 204
- `RecordPaymentRequest` (:123-130) `{kind: token|full|refund, method, amount_paise, external_reference?, notes?, received_at?}` → 201 `{payment_id}`
- `PaymentDto` (:138-146), `ListPaymentsResponse` (:149-151) `{payments}`
- `InvoiceDto` (:154-163)
- `MintCreditNoteRequest` (:168-171) `{reason, amount_paise}` → 201 `{credit_note_id, number_display}`
- confirm and complete → 204

Payment method enum: `upi|neft|rtgs|imps|cheque|cash|card_offline` (`payment.go:72-78`).

Order states (`order/state.go:22-31,67-82`): `quotation_draft → quotation_approved → token_paid → confirmed → packed → invoiced → dispatched → delivered → complete`; `cancelled` is reachable from any state except `complete` (`order.go:404-433`).

Error codes (`errcodes.go`):

- `invalid_state_transition` (409)
- `invoice_already_exists` (409)
- `payment_duplicate_reference` (409)
- `validation_failed` (422)
- `invoice_not_found` (404)
- `credit_note_invalid` (422)

Dispatch:

- `internal/dispatch/ports/dto.go:15-60`: `ConsignmentNoteDto {id, tenant_id, order_id, status: pending|dispatched|in_transit|delivered|failed, carrier_name, docket_number?, box_count, weight_grams, expected_delivery_at?, dispatched_at?, in_transit_at?, delivered_at?, failed_at?, failure_reason?, created_at, created_by_membership_id}`, `MarkDispatchedRequest {docket_number}`, `MarkFailedRequest {reason}`
- Routes `dispatch/ports/http.go:57-63`: `GET /dispatch/consignment-notes?order_id=` (404 `consignment_note_not_found`); `POST /{id}/dispatch|in-transit|delivered|failed` → 204 (`:287`)
- Packing an order creates the note through the `OrderPacked` subscriber; the delivered saga advances the order.

**Files**

- Create:
  - `src/lib/features/dispatch/{api,schemas,queries,view-models,index}.ts`
  - `src/lib/features/dispatch/components/ConsignmentCard.svelte`
  - `src/routes/(app)/orders/[id]/+page.server.ts` (`export const load = guardPage(P.ordersOrdersRead);`)
  - `src/lib/features/orders/components/{PackOrderDialog,TokenPaymentDialog,CreditNoteDialog}.svelte`
- Rewrite: `src/lib/features/orders/{schemas,api,queries,view-models,index}.ts`; `OrderDetail`, `OrderDetailHeader`, `OrderActionButtons`, `OrderItemsTable`, `PaymentsList`, `InvoiceCard`, `RecordPaymentDialog`, `OrderStatusBadge`
- Delete: `MarkPackedDialog.svelte` (becomes PackOrderDialog), `CancelOrderDialog.svelte` (ReasonConfirmDialog)
- Tests: `tests/unit/features/orders/{schemas,view-models,api}.test.ts`, `tests/unit/features/dispatch/view-models.test.ts`

**Exact web schemas**

```ts
// orders/schemas.ts
import {
	OrderLineItemDto,
	QuotationDto,
	OrderDto,
	PaymentDto,
	ListPaymentsResponse,
	InvoiceDto,
	CreateQuotationRequest,
	CreateQuotationResponse,
	ReviseQuotationRequest,
	RejectQuotationRequest,
	ApproveQuotationResponse,
	RecordTokenPaymentRequest,
	PackOrderRequest,
	InvoiceOrderResponse,
	CancelOrderRequest,
	RecordPaymentRequest,
	MintCreditNoteRequest,
	MintCreditNoteResponse
} from '#lib/api/generated/index.ts';
export const lineItemSchema = OrderLineItemDto;
export const quotationSchema = QuotationDto;
export const orderSchema = OrderDto;
export const paymentSchema = PaymentDto;
export const paymentsSchema = ListPaymentsResponse;
export const invoiceSchema = InvoiceDto;
export const orderStateSchema = OrderDto.shape.state;
export const quotationStateSchema = QuotationDto.shape.state;
export const paymentMethodSchema = PaymentDto.shape.method;
export const paymentKindSchema = PaymentDto.shape.kind;
export {
	CreateQuotationResponse as createQuotationResponseSchema,
	ApproveQuotationResponse as approveQuotationResponseSchema,
	InvoiceOrderResponse as invoiceOrderResponseSchema,
	MintCreditNoteResponse as creditNoteResponseSchema
};
/** Form schemas: rupee strings in the UI, paise on the wire (converted in the dialog via parseMoneyInput). */
export const tokenPaymentFormSchema = z.object({
	method: paymentMethodSchema,
	amount: z.string().min(1, 'Enter an amount'),
	external_reference: z.string().max(200).optional()
});
export const paymentFormSchema = tokenPaymentFormSchema.extend({
	kind: z.enum(['full', 'refund'])
});
export const packFormSchema = z.object({
	carrier_name: z.string().trim().min(1, 'Carrier is required'),
	box_count: z.coerce.number().int().min(1),
	weight_grams: z.coerce.number().int().min(1),
	expected_delivery_local: z.string().optional()
});
export const creditNoteFormSchema = z.object({
	amount: z.string().min(1),
	reason: z.string().trim().min(1, 'A reason is required').max(500)
});
export type Order = z.output<typeof orderSchema>;
export type Quotation = z.output<typeof quotationSchema>;
export type LineItem = z.output<typeof lineItemSchema>;
export type Payment = z.output<typeof paymentSchema>;
export type Invoice = z.output<typeof invoiceSchema>;
export type OrderState = z.output<typeof orderStateSchema>;
export type RecordTokenPaymentBody = z.output<typeof RecordTokenPaymentRequest>;
export type PackOrderBody = z.output<typeof PackOrderRequest>;
export type RecordPaymentBody = z.output<typeof RecordPaymentRequest>;
export type CreateQuotationBody = z.output<typeof CreateQuotationRequest>;
export type ReviseQuotationBody = z.output<typeof ReviseQuotationRequest>;
export type RejectQuotationBody = z.output<typeof RejectQuotationRequest>;
export type CancelOrderBody = z.output<typeof CancelOrderRequest>;
export type MintCreditNoteBody = z.output<typeof MintCreditNoteRequest>;
```

```ts
// dispatch/schemas.ts
import {
	ConsignmentNoteDto,
	MarkDispatchedRequest,
	MarkFailedRequest
} from '#lib/api/generated/index.ts';
export const consignmentNoteSchema = ConsignmentNoteDto;
export type ConsignmentNote = z.output<typeof consignmentNoteSchema>;
export type MarkDispatchedBody = z.output<typeof MarkDispatchedRequest>;
export type MarkFailedBody = z.output<typeof MarkFailedRequest>;
```

**Gateways**

```ts
// orders/api.ts
export const getOrder = (id: string, signal?: AbortSignal) =>
	api.get(`/v1/orders/orders/${id}`, orderSchema, { signal });
export const recordTokenPayment = (id: string, b: RecordTokenPaymentBody) =>
	api.post(`/v1/orders/orders/${id}/token-payment`, b);
export const confirmOrder = (id: string) => api.post(`/v1/orders/orders/${id}/confirm`);
export const packOrder = (id: string, b: PackOrderBody) =>
	api.post(`/v1/orders/orders/${id}/pack`, b);
export const invoiceOrder = (id: string) =>
	api.postJson(`/v1/orders/orders/${id}/invoice`, undefined, invoiceOrderResponseSchema);
export const cancelOrder = (id: string, b: CancelOrderBody) =>
	api.post(`/v1/orders/orders/${id}/cancel`, b);
export const completeOrder = (id: string) => api.post(`/v1/orders/orders/${id}/complete`);
export async function getInvoice(id: string, signal?: AbortSignal): Promise<Invoice | null>;
// api.get(`/v1/orders/orders/${id}/invoice`, invoiceSchema, { signal }); catch NotFoundError && err.code === 'invoice_not_found' → null
export const listPayments = (id: string, signal?: AbortSignal) =>
	api.get(`/v1/orders/orders/${id}/payments`, paymentsSchema, { signal }).then((r) => r.payments);
export const recordPayment = (id: string, b: RecordPaymentBody) =>
	api.post(`/v1/orders/orders/${id}/payments`, b);
export const mintCreditNote = (id: string, b: MintCreditNoteBody) =>
	api.postJson(`/v1/orders/orders/${id}/credit-notes`, b, creditNoteResponseSchema);
// quotation gateways: Task 22
```

```ts
// dispatch/api.ts
export async function getConsignmentForOrder(
	orderId: string,
	signal?: AbortSignal
): Promise<ConsignmentNote | null>;
// api.get('/v1/dispatch/consignment-notes', consignmentNoteSchema, { query: { order_id: orderId }, signal }); 404 consignment_note_not_found → null
export const markDispatched = (id: string, b: MarkDispatchedBody) =>
	api.post(`/v1/dispatch/consignment-notes/${id}/dispatch`, b);
export const markInTransit = (id: string) =>
	api.post(`/v1/dispatch/consignment-notes/${id}/in-transit`);
export const markDelivered = (id: string) =>
	api.post(`/v1/dispatch/consignment-notes/${id}/delivered`);
export const markFailed = (id: string, b: MarkFailedBody) =>
	api.post(`/v1/dispatch/consignment-notes/${id}/failed`, b);
```

**Queries**

- `ordersKeys = { all: ['orders'], order: (id) => [...all, 'order', id], payments: (id) => [...all, 'payments', id], invoice: (id) => [...all, 'invoice', id], quotation: (id) => [...all, 'quotation', id] }`
- `orderDetailQuery(getId)`, `orderPaymentsQuery(getId)`, `orderInvoiceQuery(getId, getEnabled)` (enabled when the user has `ordersInvoicesRead` and the state is ≥ invoiced)
- Every order mutation (`createResourceMutation`) invalidates `[order(id), payments(id), invoice(id)]`. Toasts:
  - token payment 'Token payment recorded'
  - confirm 'Order confirmed'
  - pack 'Order packed'
  - invoice: ``(_, r) => `Invoice ${r.number_display} issued` ``
  - cancel 'Order cancelled'
  - complete 'Order completed'
  - payment 'Payment recorded'
  - credit note `Credit note ${r.number_display} issued`
- Dialog-hosted mutations use `inlineErrors: true`.
- Dispatch keys: `['dispatch', 'order', orderId]`. Dispatch mutations invalidate that key and `ordersKeys.order(orderId)` (mutation vars carry `orderId`).

**View-models**

`orders/view-models.ts`:

- `orderState = defineStatusMap<OrderState>({ quotation_draft: {'Quotation draft', 'neutral'}, quotation_approved: {'Awaiting token payment', 'info'}, token_paid: {'Token paid', 'info'}, confirmed: {'Confirmed', 'brand'}, packed: {'Packed', 'brand'}, invoiced: {'Invoiced', 'brand'}, dispatched: {'Dispatched', 'warning'}, delivered: {'Delivered', 'success'}, complete: {'Complete', 'success'}, cancelled: {'Cancelled', 'danger'} })`
- `ORDER_FLOW: readonly OrderState[]` (the 9 forward states) and `lifecycleSteps(order): { state; label; status: 'done' | 'current' | 'todo' }[]` (cancelled shows the steps done until cancellation, plus a cancelled marker)
- `orderActions(order, can: (p: string) => boolean): OrderAction[]`, `type OrderAction = 'tokenPayment' | 'confirm' | 'pack' | 'invoice' | 'complete' | 'recordPayment' | 'creditNote' | 'cancel'`:
  - `tokenPayment`: state `quotation_approved` && `ordersPaymentsRecord`
  - `confirm`: `token_paid` && `ordersOrdersManage`
  - `pack`: `confirmed` && manage
  - `invoice`: `packed` && manage && !`invoice_id` (auto-invoice may already have run)
  - `complete`: `delivered` && manage
  - `recordPayment`: state ∈ {token_paid, confirmed, packed, invoiced, dispatched, delivered} && `ordersPaymentsRecord`
  - `creditNote`: state ∈ {delivered, complete} && `invoice_id` && manage
  - `cancel`: state ∉ {complete, cancelled} && manage
- `paymentTotals(payments, grandTotalPaise): { paidPaise; refundedPaise; balancePaise }` (token + full minus refund)
- `PAYMENT_METHOD_LABEL` (UPI, NEFT, RTGS, IMPS, Cheque, Cash, Card (offline))
- `lineTotalPaise(item) = item.unit_sale_paise * item.quantity`
- `lineGstPaise(item) = Math.round(lineTotalPaise(item) * item.gst_rate_bps / 10_000)`
- Delete `formatMoney`, `shortDate`, `longDate`, `checkPriceBand`, `computeOrderTotals`, `canX` (use `#lib/utils/format.ts` and `orderActions`)

`dispatch/view-models.ts`:

- `consignmentStatus` map (pending/dispatched/in_transit/delivered/failed)
- `consignmentActions(note, canManage): Array<'dispatch' | 'inTransit' | 'delivered' | 'failed'>`: pending → dispatch, failed; dispatched → inTransit, delivered, failed; in_transit → delivered, failed

**Components**

| Component                                                                             | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OrderDetail`                                                                         | `{#key id}` stays in the route. `QueryState` noun 'order'. Header + lifecycle (rendered inline from `lifecycleSteps` with the `Stepper` primitive). Tabs: Items, Payments, Invoice (only with `ordersInvoicesRead`). Below the tabs, a `ConsignmentCard` when `can(P.dispatchRead)` and state ∈ {packed, invoiced, dispatched, delivered, complete}. Links: "Quotation" → `/orders/quotations/{approved_quotation_id}`; "Lead" → `/leads/{customer_lead_id}`; the header title is "Order {shortId(id)}" (no `order_number`/`customer_name` in Go). When `can(P.crmLeadsRead)`, the subtitle shows the lead's `contact_name` from `leadDetailQuery` (export `leadDetailQuery` from the leads barrel). |
| `OrderDetailHeader`                                                                   | `orderState(order.state)` badge; `formatMoney(grand_total_paise)`; `formatDateTime(created_at)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `OrderActionButtons`                                                                  | One button per `orderActions(...)`. confirm/invoice/complete fire directly; tokenPayment → `TokenPaymentDialog`; pack → `PackOrderDialog`; recordPayment → `RecordPaymentDialog`; creditNote → `CreditNoteDialog`; cancel → `ReasonConfirmDialog` (noun 'order', conflict 'This order changed state. Refresh and try again.').                                                                                                                                                                                                                                                                                                                                                                       |
| `OrderItemsTable`                                                                     | Columns: SKU (mono), Description, Qty, Unit price (`formatMoney(unit_sale_paise)`), GST (`formatBps`), Line total. Footer: Subtotal `subtotal_paise`, Tax `tax_paise`, Total `grand_total_paise` (Go totals, not recomputed). Moves to the `ui/data-table` primitive (catalogue #3 occurrence; footer via a snippet after the table).                                                                                                                                                                                                                                                                                                                                                                |
| `PaymentsList`                                                                        | `ui/data-table`: Kind, Method, Amount, Reference, Received (`formatDateTime`); totals line from `paymentTotals`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `InvoiceCard`                                                                         | `DescriptionList`: Number `number_display`, Issued `formatDate(issued_at)`, Subtotal, Tax, Total; item table via `OrderItemsTable`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `TokenPaymentDialog` / `RecordPaymentDialog` / `PackOrderDialog` / `CreditNoteDialog` | `FormDialog`s. On submit: `amount_paise = parseMoneyInput(v.amount)`. A null result sets the field error "Enter an amount in rupees, e.g. 1500 or 1,500.50" before calling the mutation; `expected_delivery_at = toApiDateTime(new Date(v.expected_delivery_local))` when set.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ConsignmentCard` (dispatch)                                                          | `QueryState` (noun 'consignment note'); null → "The consignment note is created when the order is packed." `DescriptionList`: carrier, docket, boxes, weight (g), expected/dispatched/delivered dates, status badge. Actions from `consignmentActions` (`can(P.dispatchManage)`): "Mark dispatched" (FormDialog docket_number, required), "In transit" and "Delivered" (ConfirmDialog), "Failed" (ReasonConfirmDialog).                                                                                                                                                                                                                                                                              |

**e2e (same commit):**

- `orders.spec.ts` fixtures use Go `OrderDto` at `/api/v1/orders/orders/<id>`, with paise and `state`.
- Transitions return 204 and the scenario re-registers the order fixture with the next state before clicking (the mock is last-match-wins).
- The scenario "action after client-side navigation between orders hits the order on screen" is kept with Go fixtures.

- [ ] **Steps:**
  1. Write failing tests: `orderActions` for each state; `paymentTotals`; `getInvoice` returns null on 404 `invoice_not_found`; `consignmentActions`.
  2. Run (fail).
  3. Implement.
  4. Gates + `orders.spec.ts`.
  5. Commit `feat(orders): Go OrderDto contract, paise money, real transition endpoints, dispatch via consignment notes`.

---

### Task 22: Orders 3/4 — quotation detail, create from lead, line-items editor

**Files**

- Create:
  - `src/routes/(app)/orders/quotations/+layout.server.ts` (`export const load = guardRoute('/orders/quotations');`)
  - `src/routes/(app)/orders/quotations/[id]/+page.svelte`, `[id]/+page.ts` (`return { id: params.id }`)
  - `src/lib/features/orders/components/{QuotationDetail,LineItemsEditor,CreateQuotationSheet,ReviseQuotationSheet}.svelte`
- Delete: `OrderItemsEditor.svelte`, `ReviseQuotationDrawer.svelte`
- Modify:
  - `src/lib/features/orders/{api,queries,view-models,schemas,index}.ts`
  - `src/lib/features/leads/components/LeadDetailHeader.svelte` ("Create quotation" button: the leads feature imports `CreateQuotationSheet` from the orders barrel)

**Gateways**

```ts
export const getQuotation = (id: string, signal?: AbortSignal) =>
	api.get(`/v1/orders/quotations/${id}`, quotationSchema, { signal });
export const createQuotation = (b: CreateQuotationBody) =>
	api.postJson('/v1/orders/quotations', b, createQuotationResponseSchema); // 201 {quotation_id}
export const reviseQuotation = (id: string, b: ReviseQuotationBody) =>
	api.post(`/v1/orders/quotations/${id}/revise`, b); // 204
export const approveQuotation = (id: string) =>
	api.postJson(`/v1/orders/quotations/${id}/approve`, undefined, approveQuotationResponseSchema); // 200 {order_id}
export const rejectQuotation = (id: string, b: RejectQuotationBody) =>
	api.post(`/v1/orders/quotations/${id}/reject`, b); // 204
```

**Queries and mutations**

| Hook                          | Invalidate        | Toast                | After success                                                            |
| ----------------------------- | ----------------- | -------------------- | ------------------------------------------------------------------------ |
| `quotationDetailQuery(getId)` | —                 | —                    | —                                                                        |
| `createQuotationMutation`     | `[]`              | 'Quotation created'  | `goto(resolve('/(app)/orders/quotations/[id]', { id: r.quotation_id }))` |
| `reviseQuotationMutation`     | `[quotation(id)]` | 'Quotation revised'  | —                                                                        |
| `approveQuotationMutation`    | `[quotation(id)]` | 'Quotation approved' | `goto(resolve('/(app)/orders/[id]', { id: r.order_id }))`                |
| `rejectQuotationMutation`     | `[quotation(id)]` | 'Quotation rejected' | —                                                                        |

Products for the editor:

- `productPickerQuery(getSearch: () => string)` calls `listProducts({ search, active: true }, { page_size: 20 })` from the inventory barrel (Task 25 provides `listProducts`).
- Until Task 25 lands, this task depends on Task 25's inventory data layer. **Run Task 25 before this task**, or implement this task's picker against `listProducts` once Task 25's gateway exists.
- Execution order is therefore 20 → 21 → 24 → 25 → 22 → 23 → 26. The table above is grouped by bullet; follow this order.

**View-models**

- `quotationState` map: draft (info, 'Draft'), approved (success), rejected (danger)
- `quotationActions(q, canManage): Array<'revise' | 'approve' | 'reject'>`: draft → all three; other states → none
- `draftLineFromProduct(p: Product, quantity = 1, unitSalePaise: number): LineItem` → `{ product_id: p.id, sku: p.sku, description: p.name, quantity, unit_sale_paise, gst_rate_bps: p.gst_rate_bps }`
- `quotationTotals(items): { subtotalPaise; taxPaise; totalPaise }` (preview only; Go recomputes)

**Components**

- `LineItemsEditor`: props `{ items: bindable LineItem[]; productOptions: ComboboxOption[]; onSearch(q): void; productsById: ReadonlyMap<string, Product>; error? }`.
  - The parent passes options from `productPickerQuery`; the component never queries.
  - Row: product `Combobox`, quantity `NumberInput` (min 1), unit price `TextField` (rupees, converted by `parseMoneyInput`), GST shown read-only from the product (`formatBps`), line total, remove button.
  - "Add line" button; totals preview from `quotationTotals`.
- `CreateQuotationSheet`: `FormSheet` (`size="lg"`), schema `z.object({ items: z.array(lineItemSchema).min(1, 'Add at least one product'), note: z.string().max(1000).optional() })`, `initial = () => ({ items: [], note: '' })`, `onSubmit = (v) => createMut.mutateAsync({ customer_lead_id: leadId, items: v.items, note: v.note || undefined })`.
- `ReviseQuotationSheet`: same editor, seeded from `quotation.items`; `onSubmit` → `reviseMut.mutateAsync({ id, body: { items, note } })`.
- `QuotationDetail`: `QueryState` (noun 'quotation').
  - Header "Quotation {shortId(id)} · revision {revision_number}", state badge, link to the lead.
  - `OrderItemsTable` with `quotationTotals` (Go's QuotationDto has no totals; label it "Estimated totals").
  - Actions by `quotationActions`: Revise (sheet), Approve (ConfirmDialog → navigates to the order), Reject (ReasonConfirmDialog).
  - A rejected quotation shows an `Alert` with `rejection_reason`.
- `LeadDetailHeader`: "Create quotation" button when `session.can(P.ordersQuotationsManage) && session.can(P.inventoryCatalogRead)` and the stage is not `lost`. Hidden otherwise, with `title` 'Needs orders.quotations.manage and inventory.catalog.read'.

- [ ] **Steps:**
  1. Write failing tests: `quotationActions`; `draftLineFromProduct`; `quotationTotals` (GST rounding in paise).
  2. Run (fail).
  3. Implement.
  4. Gates + `orders.spec.ts` (add a quotation-detail smoke scenario).
  5. Commit `feat(orders): quotation detail, create/revise/approve/reject on Go routes, quotation from a lead`.

---

### Task 23: Orders 4/4 — e2e rewrite and validation on for `/orders` and `/dispatch/`

**Files:** `tests/e2e/orders.spec.ts` (rewrite), `tests/a11y/routes.spec.ts` (orders fixtures), `tests/e2e/helpers/contract.ts` (delete the two lines)

**Scenarios**

1. `/orders` landing copy; no `GET /api/v1/orders*` call.
2. A user without orders permissions is redirected from `/orders`; one with only `orders.quotations.read` reaches a quotation but is redirected from `/orders/<id>`.
3. Order detail: totals `₹12,345.00` from `grand_total_paise: 1234500`; items show SKU and GST `12%`.
4. `quotation_approved` → Record token payment POSTs `/token-payment {"method":"upi","amount_paise":150000}` (204); the re-registered order shows Token paid and Confirm.
5. Confirm (204) → Pack POSTs `{"carrier_name":"BlueDart","box_count":2,"weight_grams":1500}` → Packed → Invoice POST 200 `{invoice_id, number_display:'INV-0001'}` → toast contains INV-0001 → the Invoice tab GETs `/invoice`.
6. Consignment card GETs `/api/v1/dispatch/consignment-notes` with query `order_id=<id>` → pending → Mark dispatched POSTs `/dispatch {"docket_number":"BD123"}`.
7. Cancel requires a reason and POSTs `/cancel`; 409 `invalid_state_transition` shows the banner.
8. Payments tab lists `{payments:[…]}`; Record payment (full) POSTs `/payments` (201 `{payment_id}`).
9. Delivered + invoice → Credit note POSTs `/credit-notes` (201) → toast with its number.
10. Quotation: GET; Approve → 200 `{order_id}` → URL `/orders/<order_id>`; Reject with reason; Revise POSTs `/revise` (204).
11. Create from lead: the product search sends `search=para`; submit POSTs `/api/v1/orders/quotations` with paise and `gst_rate_bps` → navigates to the quotation.
12. Buttons hidden without `orders.orders.manage` or `orders.payments.record`.
13. Client-side navigation between two orders acts on the order on screen.

- [ ] **Steps:** (1) delete the unvalidated lines; (2) rewrite; (3) run; (4) gates; (5) commit `test(orders): e2e on Go-shaped, contract-validated fixtures`.

---

### Task 24: Inventory 1/3 — delete features with no Go route

**Go routes that exist** (`internal/inventory/ports/http.go:63-88`):

- `POST|GET /inventory/products`, `GET|PATCH|DELETE /inventory/products/{id}`
- `POST|GET /products/{id}/batches`, `GET /products/{id}/fefo-batches`
- `GET /inventory/batches/{id}`, `POST|GET /inventory/batches/{id}/movements`

MISSING (matrix I8, I9, I12–I19): write-off, quarantine, categories, types, gst-defaults, computed-prices, bulk-action, bulk-upload, export, and product-level movements.

**Delete**

- Components: `WriteOffBatchDialog.svelte`, `QuarantineBatchDialog.svelte`, `ProductBulkUploadDrawer.svelte`, `ProductCommercialCard.svelte` (pricing tab), `ProductRegulatoryCard.svelte` (drug schedule), `StockMovementsTimeline.svelte` (product-level; rebuilt per batch in Task 25)
- `src/lib/components/data/BulkUploadDrawer.svelte` (last user gone) and its barrel export
- `api.ts`: `writeOffBatch`, `quarantineBatch`, `listMovements`, `createMovement`, `listCategories`, `listTypes`, `getGstDefaults`, `getComputedPrices`, `bulkProductAction`, `bulkUploadPreview`, `bulkUploadCommit`, `exportProducts`, `postMultipart`
- The matching queries, schemas and barrel exports

**Edits**

- `ProductsList.svelte`: remove bulk select and the bulk bar, the bulk-upload and export actions, the low-stock and expiring saved views:
  `// TODO(backend): bulk product actions, CSV upload/export, low-stock/expiring filters — need /inventory/products/bulk-*, /export, stock aggregates (backend-checklist #10)`
- `ProductDetail.svelte`: tabs become Overview and Batches; remove the Pricing and Stock movements tabs:
  `// TODO(backend): computed prices, categories/types/GST defaults — need GET /inventory/computed-prices etc. (backend-checklist #10)`
- `BatchesList.svelte`: remove the write-off and quarantine row actions:
  `// TODO(backend): batch write-off/quarantine — no Go route; stock leaves via an outbound movement (Task 25)`
- `CreateProductDrawer.svelte`: remove the category/type selects and the GST-default autofill (Task 25 rewrites the form).

**e2e:** delete the `inventory.spec.ts` scenarios for low-stock saved view, Pricing tab, write-off, category GST autofill, select 2 + deactivate, and bulk upload.

- [ ] **Steps:** (1) remove; (2) gates; (3) `inventory.spec.ts`; (4) commit `refactor(inventory): remove write-off, quarantine, reference data, pricing, bulk and export — no Go endpoints`.

---

### Task 25: Inventory 2/3 — data layer and UI on Go product, batch and movement DTOs

**Go DTOs** (`internal/inventory/ports/dto.go`):

- `ProductDto` (:21-34) `{id, tenant_id, sku, name, dosage_form, pack_size, hsn_code, gst_rate_bps, manufacturer?, is_active, created_at, updated_at}`
- `CreateProductRequest` (:37-45) `{sku, name, dosage_form, pack_size, hsn_code, gst_rate_bps, manufacturer?}` → 201 `{product_id}`
- `UpdateProductRequest` (:64-69) `{name?, gst_rate_bps?, is_active?, manufacturer?}` → 204 (`http.go:241`); clearing the manufacturer sends `""`
- DELETE → 204; 409 `product_has_live_stock`; a missing product is also 204
- `ListProductsResponse` (:72-76)
- `BatchDto` (:81-96) `{id, product_id, tenant_id, batch_number, manufacture_date, expiry_date, manufacturer_name, manufacturing_licence_number, mrp_paise, purchase_price_paise, quantity_on_hand, version, created_at, updated_at}`
- `AddBatchRequest` (:99-107) → 201 `{batch_id}`
- `ListBatchesResponse` (:115-119), `FefoBatchesResponse` (:124-126) `{items}`
- `MovementDto` (:137-149) `{id, batch_id, product_id, tenant_id, type, quantity (signed), quantity_on_hand_after, reason, actor_membership_id, source_reference?, occurred_at}`
- `LogMovementRequest` (:156-161) `{type, quantity, reason, source_reference?}` → 201 `{movement_id, quantity_on_hand_after}` (:165-168)
- `ListMovementsResponse` (:171-175)

Movement types `inbound|outbound|adjustment|reservation|release` (`batch/batch.go:68-72`). Sign rule (`stockmovement.go:207-226`, authoritative over the DTO comment): inbound/reservation/release > 0; outbound < 0; adjustment ≠ 0.

Query params:

- products (`http.go:140-155`): `cursor`, `page_size`, `active=true`, `dosage_form`, `manufacturer`, `search`
- batches (`:342-352`): `cursor`, `page_size`, `include_expired=true`
- movements (`:469-482`): `cursor`, `page_size`, `type`

Errors: `insufficient_stock` (409), `batch_expired` (409), `concurrency_conflict` (409), `validation_failed` (422), `already_exists` (409).

**Files**

- Rewrite: `src/lib/features/inventory/{schemas,api,queries,view-models,index}.ts`; `ProductsList`, `ProductFilters`, `ProductDetail`, `ProductDetailHeader`, `ProductIdentityCard`, `BatchesList`, `AddBatchDrawer` (→ `AddBatchSheet`), `CreateProductDrawer` (→ `ProductFormSheet`, also used for edit), `AdjustStockDialog` (→ `LogMovementDialog`)
- Delete: `EditProductDrawer.svelte` (merged into `ProductFormSheet`)
- Create: `src/lib/features/inventory/components/BatchMovementsSheet.svelte`
- Tests: `tests/unit/features/inventory/{schemas,view-models,api}.test.ts`

**Exact schema**

```ts
import {
	ProductDto,
	ListProductsResponse,
	CreateProductRequest,
	CreateProductResponse,
	UpdateProductRequest,
	BatchDto,
	ListBatchesResponse,
	FefoBatchesResponse,
	AddBatchRequest,
	AddBatchResponse,
	MovementDto,
	ListMovementsResponse,
	LogMovementRequest,
	LogMovementResponse
} from '#lib/api/generated/index.ts';
export const productSchema = ProductDto;
export const productListSchema = ListProductsResponse;
export const batchSchema = BatchDto;
export const batchListSchema = ListBatchesResponse;
export const fefoBatchesSchema = FefoBatchesResponse;
export const movementSchema = MovementDto;
export const movementListSchema = ListMovementsResponse;
export const movementTypeSchema = MovementDto.shape.type;
export {
	CreateProductResponse as createProductResponseSchema,
	AddBatchResponse as addBatchResponseSchema,
	LogMovementResponse as logMovementResponseSchema
};
export const productFormSchema = CreateProductRequest.omit({ gst_rate_bps: true }).extend({
	sku: z.string().trim().min(1, 'SKU is required').max(64),
	name: z.string().trim().min(1, 'Name is required').max(200),
	dosage_form: z.string().trim().min(1, 'Dosage form is required').max(50),
	pack_size: z.string().trim().min(1, 'Pack size is required').max(100),
	hsn_code: z.string().regex(/^\d{4,10}$/, 'HSN code is 4 to 10 digits'),
	gst_percent: z.string().min(1, 'GST rate is required'),
	manufacturer: z.string().max(200).optional(),
	is_active: z.boolean().optional()
});
export const batchFormSchema = z
	.object({
		batch_number: z.string().trim().min(1).max(100),
		manufacture_date: z.string().min(1),
		expiry_date: z.string().min(1),
		manufacturer_name: z.string().trim().min(1).max(200),
		manufacturing_licence_number: z.string().trim().min(1).max(100),
		mrp: z.string().min(1),
		purchase_price: z.string().min(1)
	})
	.refine((v) => v.expiry_date > v.manufacture_date, {
		path: ['expiry_date'],
		message: 'Expiry must be after manufacture date'
	});
export const movementFormSchema = z.object({
	type: z.enum(['inbound', 'outbound', 'adjustment']),
	direction: z.enum(['increase', 'decrease']).default('increase'),
	quantity: z.coerce.number().int().min(1, 'Enter a quantity'),
	reason: z.string().trim().min(1, 'A reason is required').max(500),
	source_reference: z.string().max(200).optional()
});
export type Product = z.output<typeof productSchema>;
export type Batch = z.output<typeof batchSchema>;
export type Movement = z.output<typeof movementSchema>;
export type MovementType = z.output<typeof movementTypeSchema>;
export type CreateProductBody = z.output<typeof CreateProductRequest>;
export type UpdateProductBody = z.output<typeof UpdateProductRequest>;
export type AddBatchBody = z.output<typeof AddBatchRequest>;
export type LogMovementBody = z.output<typeof LogMovementRequest>;
export interface ProductListFilters {
	search?: string;
	active?: true;
	dosage_form?: string;
	manufacturer?: string;
}
```

**Gateways**

```ts
export async function listProducts(
	f: ProductListFilters,
	page: CursorParams,
	signal?: AbortSignal
): Promise<Page<Product>>; // GET /v1/inventory/products
export const getProduct = (id: string, signal?: AbortSignal) =>
	api.get(`/v1/inventory/products/${id}`, productSchema, { signal });
export const createProduct = (b: CreateProductBody) =>
	api.postJson('/v1/inventory/products', b, createProductResponseSchema);
export const updateProduct = (id: string, b: UpdateProductBody) =>
	api.patch(`/v1/inventory/products/${id}`, b);
export const deleteProduct = (id: string) => api.delete(`/v1/inventory/products/${id}`);
export async function listBatches(
	productId: string,
	o: { includeExpired: boolean },
	page: CursorParams,
	signal?: AbortSignal
): Promise<Page<Batch>>;
// GET /v1/inventory/products/${productId}/batches, query include_expired: o.includeExpired || undefined
export const listFefoBatches = (productId: string, signal?: AbortSignal) =>
	api
		.get(`/v1/inventory/products/${productId}/fefo-batches`, fefoBatchesSchema, { signal })
		.then((r) => r.items);
export const addBatch = (productId: string, b: AddBatchBody) =>
	api.post(`/v1/inventory/products/${productId}/batches`, b);
export async function listMovements(
	batchId: string,
	o: { type?: MovementType },
	page: CursorParams,
	signal?: AbortSignal
): Promise<Page<Movement>>;
// GET /v1/inventory/batches/${batchId}/movements
export const logMovement = (batchId: string, b: LogMovementBody) =>
	api.postJson(`/v1/inventory/batches/${batchId}/movements`, b, logMovementResponseSchema);
```

**Queries:** `inventoryKeys = { all: ['inventory'], products: () => [...all, 'products'], productList: (f) => [...products(), f], product: (id) => [...all, 'product', id], batches: (productId) => [...all, 'batches', productId], movements: (batchId) => [...all, 'movements', batchId] }`.

| Hook                    | Invalidate                                 | Toast                                                                      | Other                                                                                                                                            |
| ----------------------- | ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createProductMutation` | `[products()]`                             | 'Product created'                                                          | navigate to `/inventory/{product_id}`; inlineErrors                                                                                              |
| `updateProductMutation` | `[product(id), products()]`                | 'Product saved'                                                            | inlineErrors                                                                                                                                     |
| `deleteProductMutation` | `[products()]`                             | 'Product deleted'                                                          | navigate to `/inventory`; conflict copy for 409 `product_has_live_stock`: "This product still has batches with stock. Move the stock out first." |
| `addBatchMutation`      | `[batches(productId)]`                     | 'Batch added'                                                              | inlineErrors                                                                                                                                     |
| `logMovementMutation`   | `[movements(batchId), batches(productId)]` | ``(_, r) => `Movement logged — on hand now ${r.quantity_on_hand_after}` `` | inlineErrors                                                                                                                                     |

The old hand-rolled optimistic `adjustStock` and its Undo are deleted (catalogue B; Go movements are an append-only ledger, so an undo would be a second movement).

**View-models**

- `productActive = defineStatusMap({ true: {'Active', 'success'}, false: {'Inactive', 'neutral'} })`, called with `String(p.is_active)`
- `expiryStatus(expiryDate, now): { label; variant }`: expired (danger) / ≤ 90 days (warning) / ok (success), using `parseApiDate`
- `signedQuantity(form): number`:
  - inbound → `+q`
  - outbound → `-q`
  - adjustment → `direction === 'increase' ? +q : -q`
- `MOVEMENT_TYPE_LABEL` (5 types; reservation and release are system-made and only displayed)
- `formatQuantityDelta(n)` → `"+10"` / `"−5"`
- `toProductBody(form)` (`gst_rate_bps = percentToBps(gst_percent)`)
- `toBatchBody(form)` (dates `toApiDateTime(parseApiDate(d)!)`, money via `parseMoneyInput`)
- Delete `formatPrice`, `computePriceWithGst`, `drugScheduleBadge`, `stockLevel*`, `fefoSort` (the server does FEFO), `previewNewBalance`, `willGoNegative`

**Components**

| Component             | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductsList`        | Columns: SKU (mono), Name (link), Dosage form, Pack size, GST (`formatBps`), Manufacturer, Status. Search writes `search` (300 ms debounce, existing pattern). `ProductFilters`: "Active only" switch (`active=true`), dosage form text, manufacturer text. Saved views: All, Active. "New product" (`inventoryCatalogManage`) → `ProductFormSheet`. Keyboard nav kept. `QueryState`.                                                                                                                                                    |
| `ProductDetail`       | `QueryState` (noun 'product'). Header: name, SKU, status; Edit and Delete (`inventoryCatalogManage`; Delete via `ConfirmDialog`). Overview: `DescriptionList` (SKU, name, dosage form, pack size, HSN, GST, manufacturer, created, updated). Batches tab only with `inventoryStockRead` or `inventoryStockManage`.                                                                                                                                                                                                                       |
| `ProductFormSheet`    | `FormSheet`. Create: all fields. Edit: `name`, `gst_percent`, `manufacturer`, `is_active` editable; `sku`, `dosage_form`, `pack_size`, `hsn_code` read-only (Go `UpdateProductRequest` accepts only four fields).                                                                                                                                                                                                                                                                                                                        |
| `BatchesList`         | `ui/data-table`: Batch, Mfg date, Expiry (+ `expiryStatus` badge), MRP, Purchase, On hand, row action "Movements". Toggles: "Include expired" (`include_expired=true`) and "FEFO order" (switches the source to `listFefoBatches`: the full sellable set in FEFO order, no paging). "Add batch" (`inventoryStockManage`) → `AddBatchSheet`.                                                                                                                                                                                              |
| `BatchMovementsSheet` | `ui/sheet` with an infinite movement list (`createInfiniteList` + "Load more"), type filter `Select`, and a "Log movement" button (`inventoryStockManage`) → `LogMovementDialog`.                                                                                                                                                                                                                                                                                                                                                        |
| `LogMovementDialog`   | `FormDialog`: type (inbound / outbound / adjustment), direction (only for adjustment), quantity, reason, source reference. Submit → `logMovementMutation.mutateAsync({ batchId, productId, body: { type, quantity: signedQuantity(v), reason, source_reference } })`. Banners: 409 `insufficient_stock` "Not enough stock on hand for this outbound movement."; `batch_expired` "This batch has expired."; `concurrency_conflict` "The batch changed while you were editing. Try again." (via `describeApiError`'s `conflict` per code). |

**e2e (same commit):** `inventory.spec.ts` fixtures become Go DTOs; scenario wording follows Task 26.

- [ ] **Steps:**
  1. Write failing tests: `signedQuantity`; `toProductBody` sends `gst_rate_bps: 1200` for "12"; `expiryStatus`; `listProducts` sends `search` and `active`; `logMovement` parses 201.
  2. Run (fail).
  3. Implement.
  4. Gates + `inventory.spec.ts`.
  5. Commit `feat(inventory): Go product/batch/movement contract, per-batch ledger, FEFO view, paise prices`.

---

### Task 26: Inventory 3/3 — e2e rewrite and validation on for `/inventory/`

**Scenarios**

1. List from Go `ProductDto`; search `para` sends `search=para`; Active only sends `active=true`.
2. Create product: GST "12" POSTs `gst_rate_bps: 1200` (201 `{product_id}`) and navigates.
3. Overview shows the `DescriptionList` values.
4. Edit PATCHes only `{name, gst_rate_bps, manufacturer, is_active}` (204).
5. Delete returning 409 `product_has_live_stock` shows the banner.
6. Batches: GET batches; Include expired sends `include_expired=true`; FEFO GETs `/fefo-batches`.
7. Add batch POSTs paise and RFC 3339 dates (201); expiry before manufacture gives a field error and no POST.
8. Movements sheet GETs `/inventory/batches/<id>/movements`; outbound 5 POSTs `quantity: -5` (201 `{movement_id, quantity_on_hand_after: 95}`) and the toast shows 95.
9. 409 `insufficient_stock` shows the inline banner.
10. `inventory.catalog.read` only: no Batches tab, no New/Edit/Delete.
11. Removed features are absent: no Pricing tab, no bulk upload, no write-off.

- [ ] **Steps:** delete the `/inventory/` unvalidated line; rewrite; run; gates; commit `test(inventory): e2e on Go-shaped, contract-validated fixtures`.

---

### Task 27: Activity timelines (tenant audit events, my activity; person activity hidden)

**Go**

- `GET /v1/tenants/{tenantId}/audit/events` (`identity/ports/http.go:260`, `RequireTenantContext`; platform callers pass, so the operator scope can read any tenant by its id in the path)
- `GET /v1/auth/me/activity` (`http.go:251`)
- Params: `cursor`, `page_size` (`audit_http.go:110-116`)
- `ListAuditEventsResponse {events, has_more, next_cursor?}` (`dto.go:140-144`)
- `AuditEventDto {id, action, actor_id?, tenant_id?, correlation_id?, occurred_at, duration_ms, succeeded, failure_reason?, payload?}` (`dto.go:125-136`); `action` values look like `tenant.suspended`
- There is **no** person-activity route (matrix AU2).

**Files**

- Rewrite: `src/lib/features/audit/{api,schemas,queries,index}.ts`, `src/lib/features/audit/components/ActivityTimeline.svelte`
- Modify:
  - `routes/(app)/operator/scope/activity/+page.svelte`
  - `routes/(app)/settings/account/activity/+page.svelte`
  - `src/lib/features/operator/people/components/PersonDetail.svelte` (remove the activity tab)
  - `src/lib/features/users/components/UserDetailTabs.svelte` (remove the activity tab)
  - `tests/e2e/helpers/contract.ts` (delete the two audit lines)
  - the e2e specs that assert activity (`account-self-service`, `operator-tenant-management`)

**Interfaces**

```ts
// audit/schemas.ts
export const auditEventSchema = AuditEventDto.extend({
	payload: z.record(z.string(), z.unknown()).optional()
});
export const auditEventListSchema = ListAuditEventsResponse.extend({
	events: z.array(auditEventSchema)
});
export type AuditEvent = z.output<typeof auditEventSchema>;
// audit/api.ts
export async function listTenantAuditEvents(
	tenantId: string,
	page: CursorParams,
	signal?: AbortSignal
): Promise<Page<AuditEvent>>;
// api.get(`/v1/tenants/${tenantId}/audit/events`, auditEventListSchema, { query: cursorQuery(page), signal }) → toPage(r, 'events')
export async function listMyAuditEvents(
	page: CursorParams,
	signal?: AbortSignal
): Promise<Page<AuditEvent>>; // GET /v1/auth/me/activity
// audit/queries.ts
export const tenantActivityList = (getTenantId: () => string) =>
	createInfiniteList<AuditEvent>({
		queryKey: () => ['activity', 'tenant', getTenantId()],
		queryFn: ({ cursor, signal }) =>
			api.listTenantAuditEvents(getTenantId(), { cursor, page_size: DEFAULT_PAGE_SIZE }, signal)
	});
export const myActivityList = () =>
	createInfiniteList<AuditEvent>({
		queryKey: () => ['activity', 'me'],
		queryFn: ({ cursor, signal }) =>
			api.listMyAuditEvents({ cursor, page_size: DEFAULT_PAGE_SIZE }, signal)
	});
// audit/view-models.ts (new)
export function auditActionLabel(action: string): string; // 'tenant.suspended' → 'Tenant suspended' (humanise both segments)
export function auditActorLabel(e: AuditEvent): string; // actor_id ? `by ${shortId(actor_id)}` : 'System'
```

`ActivityTimeline` props: `{ list: InfiniteList<AuditEvent>; noun: string }`.

- `QueryState` with `query={list.query}`, `isEmpty={() => list.items.length === 0}`.
- `Timeline` items: icon from the existing `EVENT_ICONS` (keyed by `action`), `auditActionLabel`, `auditActorLabel`, `relativeTime(occurred_at)`.
- A "Failed" `Badge` plus `failure_reason` when `!succeeded`; an expandable payload `<pre>`.
- A "Load more" button when `list.hasNextPage`.

Person activity in `PersonDetail` and `UserDetailTabs`: the tab is removed, leaving `// TODO(backend): person activity — needs GET /v1/platform/persons/{id}/activity (contract matrix AU2)`.

- [ ] **Steps:**
  1. Write failing tests: `auditActionLabel('user.role_assigned') === 'User role assigned'`; `listTenantAuditEvents` hits `/audit/events` and normalises `events` to `items` with `next_cursor` omitted.
  2. Run (fail).
  3. Implement.
  4. Gates + the two e2e specs (fixture `{events:[…], has_more:false}`).
  5. Commit `feat(audit): tenant audit events and my activity on Go routes; person activity hidden`.

---

### Task 28: Operator persons email lookup and the scope tabs flag

**Go**

- `GET /v1/platform/persons?email=` (`platform_http.go:45-75`) returns **one** `PersonDto`. A missing or invalid email is 400 `invalid_email`; an unknown one is 404 `person_not_found`. There is no list or search.
- Go ignores `X-Tenant-Id` (checklist #2), so the scope `members` and `roles` pages would show the operator's home tenant.

**Files**

- Modify:
  - `src/lib/features/operator/people/{api,schemas,queries,types,index}.ts`
  - `src/lib/features/operator/people/components/PeopleList.svelte` (becomes `PersonLookup.svelte`; rename the file and the barrel export)
  - `routes/(app)/operator/persons/+page.svelte`
  - `routes/(app)/operator/scope/+layout.svelte` (tabs)
  - `routes/(app)/operator/scope/members/+page.svelte`, `roles/+page.svelte` (add `+page.ts` with a redirect)
  - `tests/e2e/operator-people-management.spec.ts`
  - `tests/e2e/helpers/contract.ts` (delete the persons line)
- Create: `src/lib/features/operator/scope/flags.ts`

**Interfaces**

```ts
// operator/people/api.ts
export async function findPersonByEmail(
	email: string,
	signal?: AbortSignal
): Promise<PersonDto | null>;
// api.get('/v1/platform/persons', personDtoSchema, { query: { email }, signal }); NotFoundError with code 'person_not_found' → null
// operator/people/schemas.ts: personDtoSchema = PersonDto (generated); delete personListResponseSchema and PersonListParams
// operator/people/queries.ts
export function personLookupQuery(getEmail: () => string); // enabled only when the email matches z.string().email()
```

```ts
// src/lib/features/operator/scope/flags.ts
/**
 * Go does not read X-Tenant-Id yet (backend-checklist #2, ADR 0039): /v1/users and /v1/roles answer with the
 * operator's HOME tenant. Members/Roles tabs stay hidden until the backend ships the header. Flip to true then.
 */
export const SCOPE_HEADER_HONOURED = false;
```

`PersonLookup.svelte`:

- An email `TextField` with a "Find" button.
- The email lives in component state only. It is **not** put in the URL: rule 10, an email is PII.
- Results: `QueryState` with one result row (name, email, lifecycle badge, link to `/operator/persons/[id]`); null shows "No person with that email."
- `// TODO(backend): person search/list — needs GET /v1/platform/persons?q=&cursor= (contract matrix OP1)`.

Scope layout `tabs`: filter out `/operator/scope/members` and `/operator/scope/roles` unless `SCOPE_HEADER_HONOURED`. `members/+page.ts` and `roles/+page.ts`: `if (!SCOPE_HEADER_HONOURED) redirect(307, '/operator/scope/profile');`. Profile, Activity (path-scoped audit) and Settings (path-scoped lifecycle) stay.

- [ ] **Steps:**
  1. Write failing tests: `findPersonByEmail` returns null on 404 `person_not_found`; e2e lookup GETs `/api/v1/platform/persons` with query `email=a%40b.in`; the scope nav has no Members or Roles; `/operator/scope/members` lands on profile.
  2. Run (fail).
  3. Implement.
  4. Gates + `operator-people-management.spec.ts` + `operator-tenant-management.spec.ts`.
  5. Commit `feat(operator): person lookup by email (Go has no list); scope Members/Roles hidden until Go reads X-Tenant-Id`.

---

### Task 29: Dashboards on real endpoints only

**Go**

- `GET /v1/tasks/work-items/dashboard` (`tasks/ports/http.go:69`, `tasks.work_items.read`; `include_team=true` requires `tasks.work_items.read_all` or 403, `:370-375`) → `DashboardResponse {today, upcoming, overdue, completed_today, total_pending}` (`tasks/ports/dto.go:74-80`)
- `GET /v1/notifications/unread-count` (`notifications/ports/http.go:55`, `notifications.inbox.read`) → `{unread_count}` (`dto.go:34-36`)
- `GET /v1/platform/stats` (existing)

**Files**

- Create: `src/lib/features/tasks/{api,schemas,queries,index}.ts`, `src/lib/features/notifications/{api,schemas,queries,index}.ts`
- Rewrite: `src/lib/features/dashboard/components/{TenantAdminDashboard,TenantUserDashboard,PlatformDashboard}.svelte` (onto `StatCard`, catalogue #10; delete the `.lk-dash-tile-icon` style copies)

**Interfaces**

```ts
// tasks
export const workItemsDashboardSchema = DashboardResponse; // generated (tasks)
export const getWorkItemsDashboard = (o: { includeTeam: boolean }, signal?: AbortSignal) =>
	api.get('/v1/tasks/work-items/dashboard', workItemsDashboardSchema, {
		query: { include_team: o.includeTeam || undefined },
		signal
	});
export function workItemsDashboardQuery(getIncludeTeam: () => boolean, getEnabled: () => boolean);
// notifications
export const getUnreadCount = (signal?: AbortSignal) =>
	api
		.get('/v1/notifications/unread-count', UnreadCountResponse, { signal })
		.then((r) => r.unread_count);
export function unreadCountQuery(getEnabled: () => boolean);
```

The generated name for the tasks dashboard schema is `DashboardResponse` (`openapi.yaml:4418`); if the generator renamed it, use its export name.

**Tiles** (render only tiles whose endpoint exists and whose permission is held; no placeholder numbers)

- Tenant admin: Tasks today / Upcoming / Overdue / Completed today (`includeTeam = session.can(P.tasksReadAll)`; caption "Team" or "Mine"), plus Unread notifications.
- Tenant user: the same four task tiles with `includeTeam = false`, plus Unread notifications.
- With no task or notification permission: one `StatCard` with value `—` and caption "No dashboard data is available for your role yet".
- Remove the "Skeleton — v0.4" alerts.
- Remove the tiles: lead credits, team active, leads this week, conversion, open orders, pending dispatches, inventory alerts.
  `// TODO(backend): dashboard aggregates (leads/orders/inventory/credits) — no Go endpoints (backend-checklist #10)`
- Platform: Tenants total, Active, Suspended, Persons, Active memberships from `/platform/stats` (deltas when present).

- [ ] **Steps:**
  1. Write failing tests: `getWorkItemsDashboard` sends `include_team=true` only when asked; e2e: a tenant user with `tasks.work_items.read` sees "Overdue 3" from the fixture and a user without it sees the `—` card.
  2. Run (fail).
  3. Implement.
  4. Gates + `role-aware-shell.spec.ts`.
  5. Commit `feat(dashboard): tiles from tasks dashboard, unread notifications and platform stats only`.

---

### Task 30: Retire the legacy client

**Files:** `src/lib/api/client.ts` (delete `apiLegacy` and `parseResponse`), `tests/e2e/helpers/contract.ts` (delete `UNVALIDATED_PATHS` and its use), `tests/unit/contract/fixture-contract.test.ts` (drop the unvalidated cases), `scripts/arch/check-no-mutate-then-refetch.mjs` (rewrite its header comment)

The new header comment for the arch check: "components never chain mutate + refetch; cache coherence lives in `createResourceMutation` (Go returns 204, backend-checklist #9)". Keep the regex.

- [ ] **Steps:**
  1. `grep -rn "apiLegacy\|parseResponse" src` must return nothing (Tasks 17, 21, 25, 27 and 28 removed the last users); fix any leftover.
  2. Delete.
  3. Gates + full `--project=chromium` e2e run, file by file.
  4. Commit `chore(api): delete the legacy client and the unvalidated-fixture allowlist — every call and fixture is checked against Go`.

---

### Task 31: BFF — client IP and User-Agent forwarding, dead `/auth/*` routes, dedupe

**Files**

- Create:
  - `src/lib/server/forwarding.ts`
  - `src/lib/server/principal.ts` (moves `decodeJwtPrincipal` from `src/lib/api/jwt.ts`; delete that file)
  - `tests/unit/stubs/app-server.ts`
- Modify:
  - `src/lib/server/go.ts` (`goFetch`, `goAuthFetch` add the forwarding headers)
  - `src/lib/server/auth-refresh.ts` (`callRefresh` adds them)
  - `src/routes/api/[...path]/+server.ts` (proxy adds them)
  - `vitest.config.ts` (alias `$app/server` to the stub)
  - `.env.example` (document `ADDRESS_HEADER` / `XFF_DEPTH`)
  - `src/lib/features/auth/api.ts` (`logout` uses `getCsrfToken`; delete `requestPasswordReset`, `resetPassword`, `readBffError` if unused; barrel exports)
  - `src/routes/(app)/settings/account/profile/+page.server.ts`, `src/routes/(app)/settings/tenant/+layout.server.ts`, `src/routes/(app)/settings/tenant/_actions.ts` (use `jwtPrincipal`)
  - `src/lib/server/proxy.ts` (comment on `TOKEN_ENDPOINTS`: "reached only through form actions")
- Delete: `src/routes/auth/login/+server.ts`, `src/routes/auth/request-password-reset/+server.ts`, `src/routes/auth/reset-password/+server.ts`
- Tests: `tests/unit/server/forwarding.test.ts`, `tests/unit/server/jwt.test.ts` (moved from `tests/unit/api/jwt.test.ts`), `tests/unit/server/tenant-settings-actions.test.ts` (mock path `#lib/server/principal.ts`), `tests/unit/server/proxy.test.ts`

```ts
// src/lib/server/forwarding.ts
import { getRequestEvent } from '$app/server';
/**
 * Client identity for Go: per-IP rate limits and session device labels (identity/ports/http.go:318-332 uses User-Agent).
 * The BFF builds upstream headers from scratch, so a browser-sent X-Forwarded-For is never passed through.
 * getClientAddress() is the real client only when adapter-node is told about the proxy chain:
 * ADDRESS_HEADER=X-Forwarded-For and XFF_DEPTH=<trusted proxy count>. Go must trust these headers only from the BFF
 * (backend-checklist #4).
 */
export function clientForwardingHeaders(event?: {
	getClientAddress(): string;
	request: Request;
}): Record<string, string> {
	let e = event;
	if (!e) {
		try {
			e = getRequestEvent();
		} catch {
			return {};
		}
	}
	const out: Record<string, string> = {};
	try {
		const ip = e.getClientAddress();
		if (ip) out['x-forwarded-for'] = ip;
	} catch {
		/* no socket (tests) */
	}
	const ua = e.request.headers.get('user-agent');
	if (ua) out['user-agent'] = ua.slice(0, 512);
	return out;
}
```

```ts
// src/lib/server/principal.ts
import { redirect, type Cookies } from '@sveltejs/kit';
import { ACCESS_COOKIE } from './cookies.ts';
// decodeJwtPrincipal + JwtDecodeError + JwtPrincipalClaims: moved verbatim from src/lib/api/jwt.ts
export function jwtPrincipal(cookies: Cookies): JwtPrincipalClaims {
	const access = cookies.get(ACCESS_COOKIE());
	if (!access) redirect(303, '/signin');
	return decodeJwtPrincipal(access);
}
```

`.env.example` (adapter-node section):

```
# Behind a reverse proxy, tell adapter-node where the client IP is, or Go sees the proxy's address
# for every user (one shared rate-limit bucket, backend-checklist #4):
# ADDRESS_HEADER=X-Forwarded-For
# XFF_DEPTH=1   # number of trusted proxies in front of the BFF
```

- [ ] **Steps:**
  1. Write failing tests: `clientForwardingHeaders({ getClientAddress: () => '203.0.113.9', request: new Request('http://x', { headers: { 'user-agent': 'UA' } }) })` → both headers; the proxy test asserts that a browser-supplied `x-forwarded-for: 1.2.3.4` is replaced by the client address; `goAuthFetch` sends `user-agent`.
  2. Run (fail).
  3. Implement. Check with `grep -rn "requestPasswordReset\|resetPassword(\|/auth/login\|/auth/reset-password\|/auth/request-password-reset" src tests` and remove all references. `NO_REFRESH_PREFIXES` keeps `'/auth/'` (logout and confirm-email-change remain).
  4. Gates + `proxy-hardening.spec.ts` and `session-refresh.spec.ts`.
  5. Commit `feat(bff): forward client IP and User-Agent to Go; remove dead /auth/* routes; one csrf reader and one JWT principal helper`.

---

### Task 32: CI hardening

**Files:** `.github/workflows/ci.yml`, `_lint.yml`, `_test.yml`, `_build.yml`, `_e2e.yml`, `_visual.yml`, `_a11y.yml`, new `_contract.yml`, new `_storybook.yml`; `.github/actions/setup/action.yml`; `.github/workflows/visual-refresh.yml`; `.github/dependabot.yml` (ensure the `github-actions` ecosystem); `vitest.config.ts` (per-glob thresholds); `playwright.config.ts` (`snapshotPathTemplate` if absent)

- [ ] **Step 1: Least privilege and pinning**
  - Add top-level `permissions: { contents: read }` in `ci.yml` and every `_*.yml`.
  - Pin every `uses:` to a full commit SHA with a version comment.
  - Resolve each with `gh api repos/<owner>/<repo>/commits/<tag> --jq .sha`, for: `actions/checkout@v6`, `actions/setup-node@v6`, `actions/cache@v5`, `actions/upload-artifact@v7`, `actions/download-artifact@<current major>`, `re-actors/alls-green@release/v1`, `peter-evans/create-pull-request@v7`.
  - Write them as `uses: actions/checkout@<sha> # v6`. Dependabot `github-actions` (weekly) keeps them current.
- [ ] **Step 2: Install and audit**
  - Setup action: replace `npm install` with `npm ci`.
  - `ci.yml` install job: `npm audit --audit-level=high` (drop `--omit=dev`).
  - `_lint.yml`: the knip step becomes `npm run lint:dead` (no `|| true`, no `--no-exit-code`).
- [ ] **Step 3: Contract job** — `_contract.yml`:
  - Checkout self.
  - `actions/checkout` with `repository: leadkart/leadkart-go`, `token: ${{ secrets.LEADKART_GO_READ_TOKEN }}`, `path: leadkart-go`, `ref: ${{ vars.LEADKART_GO_REF || 'main' }}`.
  - Setup action.
  - `LEADKART_OPENAPI_SPEC=leadkart-go/api/openapi.yaml npm run openapi:check`.
  - Add `contract` to `ci-pass.needs`. When the secret is absent (forks), the job fails with "Set LEADKART_GO_READ_TOKEN". It does not skip silently.
- [ ] **Step 4: Storybook** — `_storybook.yml`: setup, then `npm run storybook:build`. Add it to `ci-pass`.
- [ ] **Step 5: Coverage thresholds** — in `vitest.config.ts`:

```ts
thresholds: {
	statements: 5, branches: 8, functions: 3, lines: 6,
	'src/lib/server/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
	'src/lib/api/**': { statements: 90, branches: 85, functions: 90, lines: 90 },
	'src/**/view-models*.ts': { statements: 95, branches: 95, functions: 95, lines: 95 },
	'src/lib/utils/**': { statements: 95, branches: 95, functions: 95, lines: 95 }
}
```

Run `npm run test:coverage`. For every file `coverage/coverage-summary.json` reports below its glob's threshold, add unit tests in this task until it passes. Do not lower the thresholds.

- [ ] **Step 6: `visual-refresh.yml`**
  - Trigger: `on: workflow_dispatch` only.
  - Job `if: github.ref != 'refs/heads/main'`.
  - Job-level `permissions: { contents: write, pull-requests: write }`.
  - `concurrency: { group: visual-refresh-${{ github.ref }}, cancel-in-progress: true }`.
  - Steps: build, `npx playwright test --project=visual --update-snapshots`, then `peter-evans/create-pull-request@<sha>` with `branch: visual-baselines/${{ github.ref_name }}`, `base: ${{ github.ref_name }}`, `title: 'test(visual): regenerate Linux baselines'`, `commit-message` ending with the Co-Authored-By trailer. It never pushes to the source branch.
  - `playwright.config.ts`: `snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-linux{ext}'`. Baselines are generated only by this workflow on Linux.
- [ ] **Step 7:** Run `npx actionlint` if installed (otherwise push the branch and read the run) and the gates.
- [ ] **Step 8:** Commit `ci: least privilege, SHA-pinned actions, npm ci, full audit, knip/openapi/storybook gates, per-glob coverage, PR-based visual refresh`.

---

### Task 33: `CLAUDE.md` rewrite

**File:** `CLAUDE.md` (complete rewrite; keep it under 300 lines and point to the specs instead of copying them).

**Sections and their new content**

1. **What this is** — SvelteKit 3.3 adapter-node BFF in front of leadkart-go. SSR is used. The browser never sees tokens.
2. **Go is the source of truth** (new, first rule):
   - read `internal/<module>/ports/{http,dto}.go` before writing a schema
   - schemas derive from `#lib/api/generated` (`npm run openapi:codegen`)
   - features without a Go route are hidden with `TODO(backend)` + the checklist ref
   - the three contract guards (type derivation, `tests/unit/contract/gateway-routes.test.ts`, fixture validation in `tests/e2e/helpers/contract.ts`)
   - the tenant status override
3. **Reuse first (D7)** — the second occurrence is extracted. Link `docs/superpowers/specs/2026-11-18-reuse-catalogue.md`. List the shared pieces that now exist: `format.ts`, `status.ts`, `describeApiError`, `QueryState`, `DescriptionList`, `TextareaField`, `ReasonConfirmDialog`, `FormDialog`/`FormSheet`, `MembershipPicker`, `createResourceMutation`, `pagination.ts`, `createInfiniteList`, `createUrlFilters.setMany`. Replaces the "Rule of Three" section.
4. **Library doctrine** — the spec §3 table (bits-ui only inside `lib/components/ui`, shadcn-svelte, superforms+formsnap (Phase 2), TanStack Query 6, @lucide/svelte via `#lib/icons`, svelte-sonner, cva + `cn`, tw-animate-css, svelte-i18n, LayerChart/TanStack Table in Phase 2). Remove GlassSurface, Svelte Bits and vaul.
5. **Hard rules (rewritten)**:
   - feature-first layout
   - BFF cookies: `lk_access`/`__Host-lk_access` 10 min, `lk_refresh` 14 days rolling `Path=/`, `lk_csrf`, `lk_op_tenant` HMAC, `lk_mcp`
   - TypeScript; Svelte 5 runes + factory stores (no classes, no module-level `$state`)
   - one icon library
   - gateways only (`api.get(path, schema)` / `api.post` void / `api.postJson`)
   - tokens only
   - `+error.svelte` per group
   - operator scope cookie, and Go does not read `X-Tenant-Id` yet (`SCOPE_HEADER_HONOURED`)
   - no sensitive ids/emails in the URL bar
   - **mutations: Go returns 204/id; the hooks invalidate** (replaces rule 11)
   - typed errors from Go's `{error, message, detail, errors}`
6. **Permissions** — `hasCapability` semantics (super user, platform, the `tenant.admin` web rule with its deletion trigger); `nav.ts` as the single route/permission config; `guardRoute` / `guardPage`; `session.can`.
7. **Layers** — Gateway → query hooks (service) → view-models (pure) → components; depcruise rules.
8. **Where to find things** — updated table: `lib/server/*`, `lib/api/{client,errors,error-messages,mutations,pagination,generated}`, `lib/config/nav.ts`, `components/{ui,form,feedback,data}`.
9. **Stack versions** — Kit 3.3, Svelte ≥ 5.57, Vite 8, TS 6, Vitest 4, Node ≥ 22.17, Zod 4.
10. **Gates and CI** — the real gate list, including `openapi:check`; the CI jobs from Task 32; the e2e matrix (chromium/firefox/webkit + a11y + visual on Linux); the Windows notes (Vitest from PowerShell, the Playwright command, ports 4173/9999).
11. **Testing** — unit (Vitest + @testing-library/svelte), e2e against the mock Go server with contract-validated fixtures, a11y, visual baselines via `visual-refresh`.
12. **Banned** — update: SSR is allowed; remove "adapter-static only"; add "calling a route not in api/openapi.yaml", "hand-written DTO schema when a generated one exists", "client-side capability guards".
13. **Design implementation discipline** — keep the current 7 rules verbatim.
14. **Backend integration** — replace the localStorage flow with: browser → `/api/*` proxy (CSRF, Bearer, refresh single-flight, header allowlists, client IP/UA forwarding) → Go; form actions use `goFetch` / `goAuthFetch`; no Vite `/api` proxy.
15. **Roadmap** — replace with pointers to the Phase 2 and Phase 3 specs, plus the "features hidden until backend" list from this plan.

- [ ] **Steps:** write; run the gates (prettier); commit `docs: CLAUDE.md matches the BFF, Go-is-truth contract, reuse-first rule and real gates`.

---

## Spec coverage

| Bullet                                                                                   | Tasks                                                                                                                                          |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A void vs JSON client, gateways void, rule-11 comments removed                           | 3, 5, 6, 30                                                                                                                                    |
| A error contract (Go/BFF envelope, ValidationError, server action codes)                 | 2, 8                                                                                                                                           |
| A pagination helper, users paging                                                        | 4, 5 (then used in 17, 21, 25, 27)                                                                                                             |
| A capabilities fields optional                                                           | 7                                                                                                                                              |
| A cookie lifetimes                                                                       | 9                                                                                                                                              |
| A generated types + derived schemas + `openapi:check` + tenant enum note                 | 1, 7, 32                                                                                                                                       |
| A contract tests (fixture validator, gateway route scan)                                 | 10, 19, 23, 26, 27, 28, 30                                                                                                                     |
| B `hasCapability`/`deriveTier`, `tenant.admin` decision                                  | 11                                                                                                                                             |
| B server guards (any-of) incl. tenant settings actions                                   | 12 (+21, 22 for order/quotation sub-routes)                                                                                                    |
| B one nav config (sidebar, palette, titles, guards)                                      | 11, 12                                                                                                                                         |
| B action buttons gated by mutation permissions                                           | 12 (identity), 18 (leads), 21–22 (orders/dispatch), 25 (inventory)                                                                             |
| C leads re-contract                                                                      | 16, 17, 18, 19                                                                                                                                 |
| D orders re-contract                                                                     | 20, 21, 22, 23                                                                                                                                 |
| E inventory re-contract                                                                  | 24, 25, 26                                                                                                                                     |
| F user deactivate/reactivate, role update/parent, tenant lifecycle                       | 5, 6                                                                                                                                           |
| F operator persons, activity timelines, scope tabs flag, dashboards                      | 27, 28, 29                                                                                                                                     |
| G `format.ts`, `status.ts`                                                               | 13                                                                                                                                             |
| G `describeApiError`, `QueryState`, `DescriptionList`                                    | 14                                                                                                                                             |
| G `FormSheet`/`FormDialog`/`ReasonConfirmDialog` (+ `TextareaField`, `MembershipPicker`) | 15, 18                                                                                                                                         |
| G DataTable                                                                              | not upgraded; touched raw tables move to the existing `ui/data-table` (21, 25); leads/products tables keep their keyboard-nav fork for Phase 2 |
| H `SchemaError`/`RateLimitError`                                                         | 2                                                                                                                                              |
| H request timeout + `signal`                                                             | 3, 4, 5, 6 and every re-contract task                                                                                                          |
| H double toasts                                                                          | 4 (rule), 5, 6, 17, 21                                                                                                                         |
| H `useUrlFilters.setMany`                                                                | 4                                                                                                                                              |
| H cache coherence rules                                                                  | 4 (+ every mutation hook)                                                                                                                      |
| I client IP + UA forwarding, `ADDRESS_HEADER`/`XFF_DEPTH`                                | 31                                                                                                                                             |
| I `goAuthFetch`, dead routes and gateways removed                                        | 8, 31                                                                                                                                          |
| I dedupe `lk_csrf`, `GoErrorBody`, JWT helpers                                           | 8, 31                                                                                                                                          |
| J CI                                                                                     | 32                                                                                                                                             |
| J `CLAUDE.md`                                                                            | 33                                                                                                                                             |

**Deliberately left for Phase 2:**

- shadcn-svelte CLI regeneration of `lib/components/ui`
- the theme customizer and preferences cookie (`lk_ui`, worklist #7)
- full DataTable on TanStack Table v9 + virtua (leads/products/users/tenants tables)
- migrating the untouched identity drawers to `FormSheet` (CreateTenant, CreateUser, ManagerSelector, RoleAssignment, PermissionOverrides) and the formsnap field layer (catalogue #8)
- superforms internals for `FormDialog`/`FormSheet` (public API already stable)
- `ResourceListPage` + `SearchInput` + `StatusChips`, `SectionNav`, `RouteError`, `IdentityCell`, `useLeaveGuard`
- the a11y fixes in worklist "Deferred"
- binding the scope cookie to `person_id` (worklist #5), the impersonation cookie flow (worklist #6) and the service-worker offline policy (worklist #18) are not in this plan's A–J scope; they stay in the worklist

## Features that disappear until the backend adds an endpoint

| Area           | Hidden feature                                                                                                                 | Missing Go endpoint (checklist #10 unless noted)         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------- |
| Leads          | Create lead                                                                                                                    | `POST /crm/leads`                                        |
| Leads          | Edit lead (notes, email, street, compliance, product ranges, timeline, value band)                                             | `PATCH /crm/leads/{id}`                                  |
| Leads          | Bulk reassign, bulk stage, bulk temperature                                                                                    | `POST /crm/leads/bulk-action`                            |
| Leads          | CSV bulk upload (preview + commit)                                                                                             | `/crm/leads/bulk-upload/*`                               |
| Leads          | CSV export                                                                                                                     | `GET /crm/leads/export`                                  |
| Leads          | Call history list (Activity tab)                                                                                               | `GET /crm/leads/{id}/calls`                              |
| Leads          | Assignment history tab                                                                                                         | `GET /crm/leads/{id}/history`                            |
| Leads          | Reminder snooze                                                                                                                | none in Go's reminder model                              |
| Leads          | Call callback time/window fields; outcomes `switched_off`, `do_not_call`                                                       | not in `LogCallRequest` / outcome enum                   |
| Leads          | Filters: state, order value band, buy timeline, has drug licence, has GST, created range, sort, multi-select stage/temperature | not read by `parseListFilter`                            |
| Leads          | "Overdue follow-up" saved view, "stale" indicator, "last contacted" column                                                     | no `last_contacted_at` / `next_followup_at` in `LeadDto` |
| Leads          | Server-side member search in the assign picker (client-side filter of the team list instead)                                   | `GET /v1/users?q=` (matrix U11)                          |
| Orders         | Orders list and quotations list (with saved views and filters)                                                                 | `GET /orders/orders`, `GET /orders/quotations`           |
| Orders         | Order number and customer name                                                                                                 | not in `OrderDto`                                        |
| Orders         | Quotation revision timeline                                                                                                    | no revisions read model                                  |
| Orders         | Credit notes list and detail                                                                                                   | `GET /orders/orders/{id}/credit-notes[/{cnId}]`          |
| Orders         | Edit or delete a draft order; bulk cancel / delete drafts                                                                      | `PATCH                                                   | DELETE /orders/{id}`, bulk-action |
| Orders         | Price-band warning and discount % per line                                                                                     | not in `LineItemDto`                                     |
| Inventory      | Brand/generic names, product category, product type, drug schedule, shelf life, product-level MRP/purchase/sale rates          | not in `ProductDto`                                      |
| Inventory      | Categories, types, GST defaults and computed prices (Pricing tab)                                                              | reference-data endpoints                                 |
| Inventory      | Batch write-off and quarantine (an outbound movement is the substitute)                                                        | `POST /inventory/batches/{id}/write-off                  | quarantine`                       |
| Inventory      | Product bulk actions, CSV upload, CSV export                                                                                   | `/inventory/products/bulk-*`, `/export`                  |
| Inventory      | Low-stock and expiring filters; stock-level column on the product list                                                         | stock aggregates on `ProductDto`                         |
| Inventory      | Product-level stock movement timeline (now per batch)                                                                          | `GET /inventory/products/{id}/movements`                 |
| Operator       | Persons list and search (now an exact email lookup)                                                                            | `GET /platform/persons?q=&cursor=` (matrix OP1)          |
| Operator       | Person activity tab (operator person and team member detail)                                                                   | `GET /platform/persons/{id}/activity` (matrix AU2)       |
| Operator scope | Members and Roles tabs                                                                                                         | Go reading `X-Tenant-Id` (checklist #2)                  |
| Dashboards     | Lead credits, team active, leads this week, conversion, open orders, pending dispatches, inventory alerts                      | dashboard aggregate endpoints                            |
| Users          | Listing deactivated members (Go lists active only; reactivate stays reachable from the member detail page)                     | `GET /v1/users?status=inactive`                          |

## Open questions (with recommended defaults)

1. **CI access to leadkart-go for `openapi:check`.** Default: a fine-grained read-only token in repo secret `LEADKART_GO_READ_TOKEN`, pinned to `vars.LEADKART_GO_REF` (default `main`). The alternative of vendoring `openapi.yaml` into the web repo is rejected because it would create a second copy of the truth.
2. **`tenant.admin` once Go ships identity gates.** Default: keep the web rule (`tenant.admin` ⇒ `identity.*`). If Go ships without honouring it, delete the one line in `hasCapability` and reseed roles. No other web change is needed.
3. **Product range / dosage form lead filters** (Go supports them, but there is no option catalogue). Default: not offered in Phase 1c. Add `TagInput` filters in Phase 3 if the owner wants free-text values.
4. **Who may use the team picker for assignment and reminders** (it needs `GET /v1/users`, which will require `identity.users.view`). Default: rely on Go today (ungated). Ask the backend to grant `identity.users.view` to roles holding `crm.leads.assign`, or to add a narrow `GET /crm/assignees`.
5. **Creating a quotation needs `inventory.catalog.read`** for the product picker. Default: hide "Create quotation" unless both `orders.quotations.manage` and `inventory.catalog.read` are held.
6. **Finding quotations and orders again without lists.** Default: no client-side "recently viewed" store (it would look like a list but be incomplete). Navigation works through lead → create, quotation → order links, and shared URLs, until Go adds list endpoints.
7. **Kanban with many leads** (it groups only loaded pages). Default: page size 100 with "Load more"; the table view remains the complete paged list.
8. **Auto-invoice race.** Go's auto-invoice subscriber may invoice a packed order before the user clicks. Default: hide "Invoice" when `invoice_id` is present, and show Go's 409 `invoice_already_exists` copy if they race.
9. **Execution order deviation:** Task 22 needs Task 25's inventory gateway. Default order: 20 → 21 → 24 → 25 → 22 → 23 → 26.
10. **Coverage thresholds may exceed current reality** for `lib/server/**`. Default: Task 32 adds tests to meet 90% rather than lowering the bar.

### Critical files for implementation

- `D:\Development\leadkart-web\src\lib\api\client.ts`
- `D:\Development\leadkart-web\src\lib\api\errors.ts`
- `D:\Development\leadkart-web\src\lib\config\nav.ts`
- `D:\Development\leadkart-web\tests\e2e\helpers\contract.ts` (new; wired through `D:\Development\leadkart-web\tests\e2e\helpers\mock.ts`)
- `D:\Development\leadkart-web\scripts\strip-zodios.mjs`
- Go truth: `D:\Development\leadkart-go\api\openapi.yaml`, `D:\Development\leadkart-go\internal\crm\ports\dto.go`, `D:\Development\leadkart-go\internal\orders\ports\dto.go`, `D:\Development\leadkart-go\internal\inventory\ports\dto.go`, `D:\Development\leadkart-go\internal\identity\ports\authn\authn.go`
