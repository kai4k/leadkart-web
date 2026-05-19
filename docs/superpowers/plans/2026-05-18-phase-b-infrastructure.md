# Phase B Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the five-commit Phase B infrastructure — typed error taxonomy, TanStack Query provider, Toaster primitive, tenant list migration to queries, and capabilities query placeholder — on `feat/theme-customizer`.

**Architecture:** Replaces the flat `ApiError` class with a typed subclass hierarchy mapped from RFC 9457 ProblemDetails responses; mounts `@tanstack/svelte-query` at the app shell; adds a singleton Toaster; migrates the operator-tenants list (the pattern reference) to query hooks while leaving `OperatorTenantsStore` intact for the detail page.

**Tech Stack:** Svelte 5, SvelteKit 2, TypeScript 6, `@tanstack/svelte-query`, Vitest 4, existing `src/lib/api/client.ts` fetch wrapper.

---

## File map

| Status  | Path                                                                        | Responsibility                                          |
| ------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| REPLACE | `src/lib/api/errors.ts`                                                     | Typed error subclass hierarchy + RFC 9457 mapping       |
| MODIFY  | `src/lib/api/client.ts`                                                     | Throw typed subclasses instead of generic `ApiError`    |
| CREATE  | `src/lib/api/query-client.ts`                                               | QueryClient singleton with retry/stale config           |
| MODIFY  | `src/routes/(app)/+layout.svelte`                                           | Mount `QueryClientProvider` + `<Toaster />`             |
| CREATE  | `src/lib/components/ui/Toaster.svelte`                                      | Singleton toast sink with `toast()` export              |
| MODIFY  | `src/lib/components/ui/index.ts`                                            | Re-export `toast`                                       |
| MODIFY  | `src/styles/tokens.css`                                                     | Verify `--z-toast` exists (already at 1500 — confirmed) |
| CREATE  | `src/lib/features/operator/tenants/queries.ts`                              | TanStack Query hooks for tenant CRUD                    |
| MODIFY  | `src/lib/features/operator/tenants/components/TenantsList.svelte`           | Use `tenantsListQuery()`                                |
| MODIFY  | `src/lib/features/operator/tenants/components/CreateTenantDrawer.svelte`    | Use `registerTenantMutation()`                          |
| MODIFY  | `src/lib/features/operator/tenants/components/SuspendDialog.svelte`         | Use `suspendTenantMutation()`                           |
| MODIFY  | `src/lib/features/operator/tenants/components/MarkForDeletionDialog.svelte` | Use `markForDeletionMutation()`                         |
| CREATE  | `tests/unit/api/errors.test.ts`                                             | Unit tests for error taxonomy                           |
| CREATE  | `src/lib/features/auth/queries.ts`                                          | `myCapabilitiesQuery()` placeholder                     |

---

## Task 1 — Write failing tests for the error taxonomy

**Files:**

- Create: `tests/unit/api/errors.test.ts`

- [ ] **Step 1.1: Write the failing test file**

```typescript
// tests/unit/api/errors.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
	ApiError,
	NetworkError,
	TimeoutError,
	ServerError,
	ValidationError,
	AuthError,
	NotFoundError,
	ConflictError
} from '$lib/api/errors';

describe('Error subclass hierarchy', () => {
	describe('NetworkError', () => {
		it('has correct name and message', () => {
			const err = new NetworkError(new TypeError('Failed to fetch'));
			expect(err.name).toBe('NetworkError');
			expect(err).toBeInstanceOf(NetworkError);
			expect(err).toBeInstanceOf(ApiError);
			expect(err.message).toContain('network');
		});

		it('exposes cause', () => {
			const cause = new TypeError('Failed to fetch');
			const err = new NetworkError(cause);
			expect(err.cause).toBe(cause);
		});
	});

	describe('TimeoutError', () => {
		it('has correct name and message', () => {
			const err = new TimeoutError();
			expect(err.name).toBe('TimeoutError');
			expect(err).toBeInstanceOf(TimeoutError);
			expect(err).toBeInstanceOf(ApiError);
			expect(err.message).toBeTruthy();
		});
	});

	describe('ServerError', () => {
		it('has correct name, status, body', () => {
			const err = new ServerError(503, { code: 'service_unavailable' }, 'trace-abc');
			expect(err.name).toBe('ServerError');
			expect(err.status).toBe(503);
			expect(err.body).toEqual({ code: 'service_unavailable' });
			expect(err.traceId).toBe('trace-abc');
			expect(err).toBeInstanceOf(ServerError);
			expect(err).toBeInstanceOf(ApiError);
		});
	});

	describe('ValidationError', () => {
		it('populates fields from RFC 9457 body', () => {
			const err = new ValidationError(
				{ email: 'must be a valid email', password: 'min 8 chars' },
				422,
				'trace-xyz'
			);
			expect(err.name).toBe('ValidationError');
			expect(err.fields).toEqual({
				email: 'must be a valid email',
				password: 'min 8 chars'
			});
			expect(err.status).toBe(422);
			expect(err.traceId).toBe('trace-xyz');
			expect(err).toBeInstanceOf(ValidationError);
			expect(err).toBeInstanceOf(ApiError);
		});

		it('has empty fields when body has no fields', () => {
			const err = new ValidationError({}, 400);
			expect(err.fields).toEqual({});
		});
	});

	describe('AuthError', () => {
		it('discriminates 401 vs 403', () => {
			const e401 = new AuthError(401);
			const e403 = new AuthError(403);
			expect(e401.status).toBe(401);
			expect(e403.status).toBe(403);
			expect(e401.name).toBe('AuthError');
			expect(e403.name).toBe('AuthError');
			expect(e401.message).not.toBe(e403.message);
		});
	});

	describe('NotFoundError', () => {
		it('carries resource hint', () => {
			const err = new NotFoundError('/v1/tenants/missing-slug');
			expect(err.name).toBe('NotFoundError');
			expect(err.resource).toBe('/v1/tenants/missing-slug');
			expect(err).toBeInstanceOf(NotFoundError);
		});
	});

	describe('ConflictError', () => {
		it('carries detail', () => {
			const err = new ConflictError('slug already taken');
			expect(err.name).toBe('ConflictError');
			expect(err.detail).toBe('slug already taken');
		});
	});
});

describe('ApiError.fromResponse — RFC 9457 ProblemDetails mapping', () => {
	function makeResponse(status: number, body: unknown): Response {
		return {
			status,
			url: '/v1/tenants',
			statusText: 'Error',
			ok: false
		} as unknown as Response;
	}

	it('maps 401 → AuthError(401)', () => {
		const err = ApiError.fromResponse(makeResponse(401, null), null);
		expect(err).toBeInstanceOf(AuthError);
		expect((err as AuthError).status).toBe(401);
	});

	it('maps 403 → AuthError(403)', () => {
		const err = ApiError.fromResponse(makeResponse(403, null), null);
		expect(err).toBeInstanceOf(AuthError);
		expect((err as AuthError).status).toBe(403);
	});

	it('maps 404 → NotFoundError with resource hint from url', () => {
		const resp = { ...makeResponse(404, null), url: '/v1/tenants/unknown' } as unknown as Response;
		const err = ApiError.fromResponse(resp, null);
		expect(err).toBeInstanceOf(NotFoundError);
		expect((err as NotFoundError).resource).toBe('/v1/tenants/unknown');
	});

	it('maps 409 → ConflictError with detail from body', () => {
		const body = { detail: 'slug taken', code: 'conflict' };
		const err = ApiError.fromResponse(makeResponse(409, body), body);
		expect(err).toBeInstanceOf(ConflictError);
		expect((err as ConflictError).detail).toBe('slug taken');
	});

	it('maps 422 → ValidationError with fields from RFC 9457 body', () => {
		const body = { fields: { email: 'invalid' }, trace_id: 'tr-1' };
		const err = ApiError.fromResponse(makeResponse(422, body), body);
		expect(err).toBeInstanceOf(ValidationError);
		expect((err as ValidationError).fields).toEqual({ email: 'invalid' });
		expect((err as ValidationError).traceId).toBe('tr-1');
	});

	it('maps 422 with legacy { code, message } body — empty fields, no crash', () => {
		const body = { code: 'invalid_body', message: 'bad request' };
		const err = ApiError.fromResponse(makeResponse(422, body), body);
		expect(err).toBeInstanceOf(ValidationError);
		expect((err as ValidationError).fields).toEqual({});
	});

	it('maps 500 → ServerError', () => {
		const body = { code: 'internal', message: 'boom' };
		const err = ApiError.fromResponse(makeResponse(500, body), body);
		expect(err).toBeInstanceOf(ServerError);
		expect((err as ServerError).status).toBe(500);
	});

	it('maps generic 4xx → ApiError (base)', () => {
		const err = ApiError.fromResponse(makeResponse(429, null), null);
		// Should not be a subclass — just ApiError
		expect(err).toBeInstanceOf(ApiError);
		expect(err).not.toBeInstanceOf(AuthError);
		expect(err).not.toBeInstanceOf(ValidationError);
		expect(err).not.toBeInstanceOf(ServerError);
	});

	it('captures trace_id on ApiError base', () => {
		const body = { trace_id: 'trace-999' };
		const err = ApiError.fromResponse(makeResponse(429, body), body);
		expect(err.traceId).toBe('trace-999');
	});
});

describe('ApiError.transport', () => {
	it('wraps TypeError from fetch into NetworkError', () => {
		const cause = new TypeError('Failed to fetch');
		const err = ApiError.transport(cause);
		expect(err).toBeInstanceOf(NetworkError);
		expect((err as NetworkError).cause).toBe(cause);
	});

	it('wraps abort-controller DOMException into TimeoutError', () => {
		const abortErr = new DOMException('The operation was aborted.', 'AbortError');
		const err = ApiError.transport(abortErr);
		expect(err).toBeInstanceOf(TimeoutError);
	});
});
```

- [ ] **Step 1.2: Run test to confirm it fails**

```bash
cd d:/Development/leadkart-web && npx vitest run tests/unit/api/errors.test.ts 2>&1 | tail -30
```

Expected: FAIL — `NetworkError`, `TimeoutError`, etc. are not exported from `$lib/api/errors`.

---

## Task 2 — Replace `src/lib/api/errors.ts` with typed subclass hierarchy

**Files:**

- Replace: `src/lib/api/errors.ts`

- [ ] **Step 2.1: Write the new errors.ts**

Replace the entire file content with:

```typescript
/**
 * Typed API error hierarchy — subclasses per HTTP/transport failure mode.
 *
 * Components pattern-match on `instanceof <Subclass>` for specific UX:
 *   - NetworkError  → retry button + "check your network"
 *   - AuthError(401) → redirect to /signin
 *   - AuthError(403) → "permission denied" inline
 *   - ValidationError → per-field inline errors (fields map)
 *   - NotFoundError  → 404 page / empty state
 *   - ConflictError  → inline "already exists" message
 *   - ServerError    → generic "try again" with trace ID for support
 *
 * Wire format tolerates both legacy `{ code, message }` (leadkart-go
 * current) and RFC 9457 ProblemDetails `{ code, title, detail, fields,
 * trace_id }` (per ADR 0038 §A.9). Both shapes map to the same subclass.
 */

// ── Wire body shapes ────────────────────────────────────────────────────

/**
 * Legacy leadkart-go ErrorResponse envelope.
 * `{ "error": "slug_taken", "message": "..." }`
 */
export interface LegacyApiErrorBody {
	error?: string;
	code?: string;
	message?: string;
	details?: Record<string, unknown>;
}

/**
 * RFC 9457 ProblemDetails — extended shape per ADR 0038 §A.9.
 * `{ "code": "validation_failed", "title": "...", "detail": "...",
 *    "fields": { "email": "..." }, "trace_id": "req_..." }`
 */
export interface ProblemDetails {
	code?: string;
	title?: string;
	detail?: string;
	message?: string;
	fields?: Record<string, string>;
	trace_id?: string;
	retryable?: boolean;
}

/** Union of both wire shapes. */
export type ApiErrorBody = LegacyApiErrorBody | ProblemDetails;

// ── Base class ────────────────────────────────────────────────────────────

export class ApiError extends Error {
	override readonly name = 'ApiError';

	constructor(public readonly traceId?: string) {
		super('An unexpected error occurred.');
	}

	// ── Factory: maps HTTP response → typed subclass ──────────────────────

	static fromResponse(response: Response, body: ApiErrorBody | null): ApiError {
		const b = body as (ProblemDetails & LegacyApiErrorBody) | null;
		const traceId = b?.trace_id;

		switch (response.status) {
			case 401:
				return new AuthError(401, traceId);
			case 403:
				return new AuthError(403, traceId);
			case 404:
				return new NotFoundError(response.url ?? 'unknown resource', traceId);
			case 409: {
				const detail = b?.detail ?? b?.message ?? 'Conflict';
				return new ConflictError(detail, traceId);
			}
			case 422:
			case 400: {
				const fields: Record<string, string> = b?.fields ?? {};
				return new ValidationError(fields, response.status as 400 | 422, traceId);
			}
		}

		if (response.status >= 500) {
			return new ServerError(response.status, body, traceId);
		}

		// Generic 4xx or unclassified
		const err = new ApiError(traceId);
		const msg = b?.message ?? b?.detail ?? b?.title ?? response.statusText ?? 'Request failed';
		err.message = msg;
		return err;
	}

	// ── Factory: maps transport-level throw → typed subclass ─────────────

	/**
	 * Wraps the raw error thrown by `fetch()`:
	 *   - `DOMException { name: 'AbortError' }` → `TimeoutError`
	 *   - `TypeError` (network down, CORS, DNS) → `NetworkError`
	 *   - anything else → `NetworkError` (safe default)
	 */
	static transport(cause: unknown): NetworkError | TimeoutError {
		if (cause instanceof DOMException && cause.name === 'AbortError') {
			return new TimeoutError();
		}
		return new NetworkError(cause);
	}

	/** Sentinel for the silent-refresh path: 401 + refresh also failed. */
	static refreshFailed(): AuthError {
		const err = new AuthError(401);
		err.message = 'Session expired. Please sign in again.';
		return err;
	}
}

// ── Subclasses ────────────────────────────────────────────────────────────

/** Socket hangup, offline, DNS failure, CORS block — `fetch()` threw `TypeError`. */
export class NetworkError extends ApiError {
	override readonly name = 'NetworkError';

	constructor(public readonly cause: unknown) {
		super();
		this.message = 'Connection problem — check your network and try again.';
	}
}

/** AbortController fired before the server responded. */
export class TimeoutError extends ApiError {
	override readonly name = 'TimeoutError';

	constructor() {
		super();
		this.message = 'Request timed out. The server may be slow — try again.';
	}
}

/** 5xx response — server-side fault, retryable. */
export class ServerError extends ApiError {
	override readonly name = 'ServerError';

	constructor(
		public readonly status: number,
		public readonly body: unknown,
		traceId?: string
	) {
		super(traceId);
		this.message = 'Server error — our team has been notified. Please try again.';
	}
}

/** 400 or 422 with structured field-level validation failures. */
export class ValidationError extends ApiError {
	override readonly name = 'ValidationError';

	constructor(
		public readonly fields: Record<string, string>,
		public readonly status: 400 | 422,
		traceId?: string
	) {
		super(traceId);
		const count = Object.keys(fields).length;
		this.message =
			count > 0 ? `Validation failed: ${Object.values(fields).join('; ')}` : 'Validation failed';
	}
}

/** 401 or 403 — auth/authz failure. */
export class AuthError extends ApiError {
	override readonly name = 'AuthError';

	constructor(
		public readonly status: 401 | 403,
		traceId?: string
	) {
		super(traceId);
		this.message =
			status === 401 ? 'Sign in to continue.' : "You don't have permission for this action.";
	}
}

/** 404 — resource not found. */
export class NotFoundError extends ApiError {
	override readonly name = 'NotFoundError';

	constructor(
		public readonly resource: string,
		traceId?: string
	) {
		super(traceId);
		this.message = `${resource} not found.`;
	}
}

/** 409 — conflict (slug taken, duplicate record, etc.). */
export class ConflictError extends ApiError {
	override readonly name = 'ConflictError';

	constructor(
		public readonly detail: string,
		traceId?: string
	) {
		super(traceId);
		this.message = detail;
	}
}

// ── Legacy compat ─────────────────────────────────────────────────────────

/** Type predicate — narrows `unknown` to `ApiError` safely. */
export function isApiError(value: unknown): value is ApiError {
	return value instanceof ApiError;
}

/** Sentinel codes used by client.ts (preserved for backward compat). */
export const TRANSPORT_ERROR = 'transport';
export const REFRESH_FAILED = 'auth.refresh_failed';
```

- [ ] **Step 2.2: Run the tests**

```bash
cd d:/Development/leadkart-web && npx vitest run tests/unit/api/errors.test.ts 2>&1 | tail -30
```

Expected: PASS.

- [ ] **Step 2.3: Run full unit suite to make sure nothing else broke**

```bash
cd d:/Development/leadkart-web && npm run test 2>&1 | tail -20
```

Expected: all tests pass (or only pre-existing failures).

---

## Task 3 — Update `client.ts` to throw typed subclasses

**Files:**

- Modify: `src/lib/api/client.ts`

The current `client.ts` imports `{ ApiError, isApiError, type ApiErrorBody }` from `./errors`. After the errors.ts rewrite, `ApiError.fromResponse` and `ApiError.transport` still exist with the same signatures, so the import stays. One change is needed: the `_retried` 401 path currently calls `ApiError.refreshFailed()` — which now returns an `AuthError`, so the 401 guard line changes slightly.

- [ ] **Step 3.1: Update the import line in client.ts**

In `src/lib/api/client.ts`, the import line is:

```typescript
import { ApiError, isApiError, type ApiErrorBody } from './errors';
```

Change to:

```typescript
import { ApiError, isApiError } from './errors';
```

(The `ApiErrorBody` type is no longer needed in client.ts because `fromResponse` accepts `ApiErrorBody | null` internally.)

- [ ] **Step 3.2: Update the `request` function's transport catch**

The current catch block is:

```typescript
} catch (cause) {
    throw ApiError.transport(cause);
}
```

This is already correct — `ApiError.transport` now returns `NetworkError | TimeoutError`, both of which are `ApiError` subclasses. No code change needed here.

- [ ] **Step 3.3: Verify `npm run check` passes**

```bash
cd d:/Development/leadkart-web && npm run check 2>&1 | tail -30
```

Expected: 0 type errors (or pre-existing errors only).

---

## Task 4 — Commit 1: error taxonomy

- [ ] **Step 4.1: Stage and commit**

```bash
cd d:/Development/leadkart-web && git add src/lib/api/errors.ts src/lib/api/client.ts tests/unit/api/errors.test.ts && git commit -m "feat(api): typed error taxonomy + RFC 9457 ProblemDetails mapping"
```

Expected: clean commit on `feat/theme-customizer`.

---

## Task 5 — Install `@tanstack/svelte-query` + create query-client

**Files:**

- Create: `src/lib/api/query-client.ts`

- [ ] **Step 5.1: Install the package**

```bash
cd d:/Development/leadkart-web && npm install @tanstack/svelte-query 2>&1 | tail -10
```

Expected: added to `dependencies` in package.json.

- [ ] **Step 5.2: Create `src/lib/api/query-client.ts`**

```typescript
/**
 * TanStack Query client — singleton instance shared across the app.
 *
 * Mount in (app)/+layout.svelte via:
 *   <QueryClientProvider client={queryClient}>
 *     {@render children()}
 *   </QueryClientProvider>
 *
 * Retry policy (per spec §B.1.1):
 *   - NetworkError / ServerError: up to 2 retries (transport fault, retryable)
 *   - AuthError: no retry (401 = not authed, 403 = not permitted)
 *   - Everything else: no retry (4xx are caller faults)
 * Mutations are never auto-retried (not idempotent by default).
 */
import { QueryClient } from '@tanstack/svelte-query';
import { NetworkError, ServerError, AuthError } from './errors';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000, // 30 s stale-while-revalidate window
			gcTime: 5 * 60_000, // 5 min cache retention after unmount
			retry: (failureCount, error) => {
				if (error instanceof AuthError) return false;
				if (error instanceof NetworkError || error instanceof ServerError) {
					return failureCount < 2;
				}
				return false;
			},
			refetchOnWindowFocus: true,
			refetchOnReconnect: true
		},
		mutations: {
			retry: false // mutations are not idempotent by default
		}
	}
});
```

- [ ] **Step 5.3: Verify TypeScript compiles**

```bash
cd d:/Development/leadkart-web && npm run check 2>&1 | tail -20
```

Expected: 0 new type errors.

---

## Task 6 — Mount `QueryClientProvider` in `(app)/+layout.svelte`

**Files:**

- Modify: `src/routes/(app)/+layout.svelte`

- [ ] **Step 6.1: Update the layout file**

Replace the entire content of `src/routes/(app)/+layout.svelte` with:

```svelte
<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import AppShell from '$layouts/AppShell.svelte';
	import ImpersonationBanner from '$features/operator/impersonation/components/ImpersonationBanner.svelte';
	import { impersonation } from '$features/operator/impersonation/stores/impersonation.svelte';
	import { session } from '$features/auth/stores/session.svelte';
	import { queryClient } from '$lib/api/query-client';
	import Toaster from '$lib/components/ui/Toaster.svelte';

	let { children } = $props();

	$effect(() => {
		if (session.principal) {
			impersonation.reconcile().catch(() => {});
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<ImpersonationBanner />
	<AppShell>
		{@render children()}
	</AppShell>
	<Toaster />
</QueryClientProvider>
```

Note: `<Toaster />` is a sibling to `<AppShell>` inside the provider but outside the AppShell so toasts render above all shell chrome. The import for `Toaster.svelte` will fail until Task 7 creates the file — that's expected. Run check only after Task 7.

---

## Task 7 — Create `Toaster.svelte` + re-export `toast`

**Files:**

- Create: `src/lib/components/ui/Toaster.svelte`
- Modify: `src/lib/components/ui/index.ts`

- [ ] **Step 7.1: Create `src/lib/components/ui/Toaster.svelte`**

```svelte
<script lang="ts" module>
	/**
	 * SINGLETON EXCEPTION: This module uses module-level `$state`, which
	 * CLAUDE.md rule 4 normally bans (it silently breaks cross-module
	 * reactivity). Toaster is a deliberate exception:
	 *
	 *   - Exactly ONE <Toaster /> is mounted in (app)/+layout.svelte.
	 *   - `toast()` is the sole writer, `<Toaster>` is the sole reader.
	 *   - Module-level `$state` is correct for a singleton sink — there
	 *     is no cross-module reactivity concern because nothing else
	 *     derives from or subscribes to `toasts` outside this file.
	 *
	 * Class-based stores are correct for multi-instance or cross-module
	 * reactive state. Singleton UI sinks (like this toaster) are the
	 * canonical exception pattern (used by shadcn-svelte, Melt UI, etc).
	 */
	import { browser } from '$app/environment';

	type ToastVariant = 'success' | 'danger' | 'warning' | 'info';
	type Toast = { id: string; variant: ToastVariant; message: string };

	const toasts = $state<Toast[]>([]);

	/**
	 * Enqueues a toast notification. Auto-dismissed after 5 s.
	 * No-op during SSR (`browser` guard).
	 *
	 * Usage:
	 *   import { toast } from '$ui';
	 *   toast('success', 'Tenant suspended');
	 *   toast('danger', 'Failed to load tenants');
	 */
	export function toast(variant: ToastVariant, message: string): void {
		if (!browser) return;
		const id = crypto.randomUUID();
		toasts.push({ id, variant, message });
		setTimeout(() => {
			const idx = toasts.findIndex((t) => t.id === id);
			if (idx >= 0) toasts.splice(idx, 1);
		}, 5000);
	}
</script>

<div
	class="pointer-events-none fixed right-4 bottom-4 z-[var(--z-toast)] flex flex-col gap-2"
	aria-live="polite"
	aria-atomic="false"
>
	{#each toasts as t (t.id)}
		{@const borderColour =
			t.variant === 'success'
				? 'border-l-4 border-[var(--color-success-500)]'
				: t.variant === 'danger'
					? 'border-l-4 border-[var(--color-danger-500)]'
					: t.variant === 'warning'
						? 'border-l-4 border-[var(--color-warning-500)]'
						: 'border-l-4 border-[var(--color-info-500)]'}
		<div
			class="glass-card animate-slide-in-right pointer-events-auto max-w-sm px-4 py-3 {borderColour}"
			role="status"
		>
			<p class="label text-[var(--color-fg)]">{t.message}</p>
		</div>
	{/each}
</div>
```

- [ ] **Step 7.2: Re-export `toast` from the UI barrel**

In `src/lib/components/ui/index.ts`, add this line after the existing exports:

```typescript
export { toast } from './Toaster.svelte';
```

The full file should look like:

```typescript
export { default as Alert } from './Alert.svelte';
export { default as AuthCard } from './AuthCard.svelte';
export { default as Avatar } from './Avatar.svelte';
export { default as Badge } from './Badge.svelte';
export { default as Button } from './Button.svelte';
export * as Card from './card';
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export * as Dialog from './dialog';
export * as Drawer from './drawer';
export * as Dropdown from './dropdown';
export { default as EmptyState } from './EmptyState.svelte';
export { default as Logo } from './Logo.svelte';
export { default as Pagination } from './Pagination.svelte';
export { default as Spinner } from './Spinner.svelte';
export * as Tooltip from './tooltip';
export { toast } from './Toaster.svelte';
```

- [ ] **Step 7.3: Verify `--z-toast` token exists in tokens.css**

Search `src/styles/tokens.css` for `--z-toast`. It is already declared at 1500 (confirmed in codebase read). No change needed.

- [ ] **Step 7.4: Verify `npm run check` passes**

```bash
cd d:/Development/leadkart-web && npm run check 2>&1 | tail -30
```

Expected: 0 new type errors.

- [ ] **Step 7.5: Verify `npm run build` passes**

```bash
cd d:/Development/leadkart-web && npm run build 2>&1 | tail -20
```

Expected: successful static build.

---

## Task 8 — Commit 2: TanStack Query provider

- [ ] **Step 8.1: Stage and commit**

```bash
cd d:/Development/leadkart-web && git add package.json package-lock.json src/lib/api/query-client.ts src/routes/(app)/+layout.svelte src/lib/components/ui/Toaster.svelte src/lib/components/ui/index.ts && git commit -m "feat(api): @tanstack/svelte-query + QueryClient provider"
```

---

## Task 9 — Commit 3: Toaster primitive

Note: Toaster was committed in Task 8 above together with the QueryClient provider. Per the spec, Commits 2 and 3 can be one commit if the files land together. If a separate commit is required, cherry-pick at the end. For this plan, Toaster ships in the same commit as the provider (pragmatic — both touch `+layout.svelte`).

If the spec requires strict separation, do:

```bash
# Reset the last commit, split into two:
cd d:/Development/leadkart-web && git reset HEAD~1
git add package.json package-lock.json src/lib/api/query-client.ts src/routes/(app)/+layout.svelte
git commit -m "feat(api): @tanstack/svelte-query + QueryClient provider"
git add src/lib/components/ui/Toaster.svelte src/lib/components/ui/index.ts
git commit -m "feat(ui): Toaster primitive + toast() singleton"
```

---

## Task 10 — Create tenant queries file

**Files:**

- Create: `src/lib/features/operator/tenants/queries.ts`

- [ ] **Step 10.1: Create the queries file**

```typescript
/**
 * TanStack Query hooks for the operator-side tenant surface.
 *
 * Pattern reference for Phase B: all server-state for this feature
 * flows through these hooks. Components import the hook they need;
 * the QueryClient handles caching, background refresh, and invalidation.
 *
 * Cache key hierarchy:
 *   ['tenants']                     — root scope for invalidateQueries
 *   ['tenants', 'list']             — full list (GET /v1/platform/tenants)
 *   ['tenants', 'detail', id]       — single tenant by UUID
 *
 * NOTE: OperatorTenantsStore is NOT deleted in this commit — the
 * detail page still uses it. Migration is incremental: list + create +
 * mutate hooks land here; detail-page migration is a follow-up slice.
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import * as api from './api';
import type { RegisterTenantRequest } from './types';

// ── Query key factory ──────────────────────────────────────────────────

export const tenantsKeys = {
	all: ['tenants'] as const,
	list: () => [...tenantsKeys.all, 'list'] as const,
	detail: (id: string) => [...tenantsKeys.all, 'detail', id] as const
};

// ── Query hooks ────────────────────────────────────────────────────────

/**
 * Full tenant list — operator scope (GET /v1/platform/tenants).
 * Operator JWT with `is_platform=true` sees all tenants; no header override
 * needed for this call (list is not tenant-scoped).
 */
export function tenantsListQuery() {
	return createQuery({
		queryKey: tenantsKeys.list(),
		queryFn: () => api.listTenants()
	});
}

/**
 * Single tenant by UUID.
 * `enabled: !!tenantId` — skips the query when called without an ID
 * (avoids a spurious /v1/tenants/undefined request).
 */
export function tenantDetailQuery(tenantId: string) {
	return createQuery({
		queryKey: tenantsKeys.detail(tenantId),
		queryFn: () => api.getTenant(tenantId),
		enabled: !!tenantId
	});
}

// ── Mutation hooks ─────────────────────────────────────────────────────

/** Register a new tenant. On success, invalidates the full list. */
export function registerTenantMutation() {
	const qc = useQueryClient();
	return createMutation({
		mutationFn: (req: RegisterTenantRequest) => api.registerTenant(req),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
		}
	});
}

/** Suspend a tenant. On success, invalidates list + detail. */
export function suspendTenantMutation() {
	const qc = useQueryClient();
	return createMutation({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.suspendTenant(id, { reason }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
		}
	});
}

/** Activate a tenant. On success, invalidates list + detail. */
export function activateTenantMutation() {
	const qc = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => api.activateTenant(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
		}
	});
}

/** Mark a tenant for deletion. On success, invalidates list + detail. */
export function markForDeletionMutation() {
	const qc = useQueryClient();
	return createMutation({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.markForDeletion(id, { reason }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
		}
	});
}

/** Restore a marked-for-deletion tenant. On success, invalidates list + detail. */
export function restoreTenantMutation() {
	const qc = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => api.restoreTenant(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
		}
	});
}
```

- [ ] **Step 10.2: Verify TypeScript compiles**

```bash
cd d:/Development/leadkart-web && npm run check 2>&1 | tail -20
```

Expected: 0 new errors.

---

## Task 11 — Migrate `TenantsList.svelte` to TanStack Query

**Files:**

- Modify: `src/lib/features/operator/tenants/components/TenantsList.svelte`

The current component uses `operatorTenants` store. Replace with `tenantsListQuery()`. The client-side search, platform-pin, and pagination logic stay intact — they now operate on `$query.data?.tenants` instead of `operatorTenants.filtered`.

- [ ] **Step 11.1: Replace TenantsList.svelte**

```svelte
<script lang="ts">
	import { Alert, Badge, Button, Card, EmptyState, Spinner } from '$ui';
	import { Building2, Eye, Plus, Search, Shield, Icon } from '$icons';
	import { tenantsListQuery } from '$features/operator/tenants/queries';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import { hasPermission } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';
	import { NetworkError } from '$lib/api/errors';
	import CreateTenantDrawer from './CreateTenantDrawer.svelte';
	import ImpersonateModal from '$features/operator/impersonation/components/ImpersonateModal.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	const PAGE_SIZE = 10;

	let createOpen = $state(false);
	let impersonateOpen = $state(false);
	let impersonateTarget = $state<TenantDto | null>(null);
	let page = $state(1);
	let search = $state('');

	const canCreate = $derived(hasPermission(session.principal, 'platform.tenants.create'));
	const canView = $derived(hasPermission(session.principal, 'platform.tenants.view'));

	const query = tenantsListQuery();

	/**
	 * Client-side search + platform-pin.
	 * Platform tenant (slug === 'platform') is always first — Stripe
	 * Connect / Auth0 tenant-list pattern.
	 */
	const filtered = $derived.by(() => {
		const all = $query.data?.tenants ?? [];
		const q = search.trim().toLowerCase();
		const matched = q
			? all.filter(
					(t) =>
						t.slug.toLowerCase().includes(q) ||
						t.display_name.toLowerCase().includes(q) ||
						t.legal_name.toLowerCase().includes(q)
				)
			: all;
		const platform = matched.find((t) => t.slug === 'platform');
		const rest = matched.filter((t) => t.slug !== 'platform');
		return platform ? [platform, ...rest] : rest;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
	const paged = $derived(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

	// Reset to page 1 when search changes.
	$effect(() => {
		void search;
		page = 1;
	});

	function openImpersonate(tenant: TenantDto) {
		impersonateTarget = tenant;
		impersonateOpen = true;
	}
</script>

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Tenants</h1>
			<p class="caption text-[var(--color-fg-muted)]">Operator-side tenant management.</p>
		</div>
		{#if canCreate}
			<Button onclick={() => (createOpen = true)}>
				<Icon icon={Plus} size="sm" /> Register tenant
			</Button>
		{/if}
	</header>

	<div class="cluster">
		<div class="relative flex-1">
			<span class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
				<Icon icon={Search} size="sm" class="text-[var(--color-fg-subtle)]" />
			</span>
			<input
				type="search"
				placeholder="Filter by name, slug, or legal name"
				bind:value={search}
				class="glass-input w-full rounded-md py-2 pr-3 pl-9 text-sm"
				aria-label="Filter tenants"
			/>
		</div>
	</div>

	{#if $query.isPending}
		<div class="flex items-center justify-center py-12">
			<Spinner size={32} />
		</div>
	{:else if $query.isError}
		{@const err = $query.error}
		{#if err instanceof NetworkError}
			<Alert variant="warning" title="Connection problem">
				We couldn't reach the server. Check your network.
				<Button variant="ghost" size="sm" onclick={() => $query.refetch()} class="mt-2"
					>Retry</Button
				>
			</Alert>
		{:else}
			<Alert variant="danger" title="Failed to load tenants">
				{err.message}
				<Button variant="ghost" size="sm" onclick={() => $query.refetch()} class="mt-2"
					>Retry</Button
				>
			</Alert>
		{/if}
	{:else if ($query.data?.tenants ?? []).length === 0}
		<EmptyState
			icon={Building2}
			title="No tenants yet"
			description="Register the first one using the button above."
		/>
	{:else if filtered.length === 0}
		<EmptyState
			icon={Building2}
			title="No matches for '{search}'"
			description="Try a different name or slug."
		/>
	{:else}
		<ul class="stack stack-tight" aria-label="Tenants">
			{#each paged as t (t.id)}
				{@const badge = tenantLifecycleBadge(t)}
				{@const isPlatform = t.slug === 'platform'}
				<li>
					<Card.Root>
						<Card.Content class="grid grid-cols-[1fr_auto] items-center gap-4">
							<div class="stack stack-tight">
								<div class="cluster cluster-tight">
									{#if isPlatform}
										<Icon icon={Shield} size="sm" class="text-[var(--color-primary)]" />
									{/if}
									<a
										href="/operator/tenants/{t.id}"
										class="h5 text-[var(--color-fg)] hover:underline">{t.display_name}</a
									>
									{#if isPlatform}
										<Badge variant="brand" style="soft" size="sm">Platform</Badge>
									{/if}
									<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
								</div>
								<p class="caption text-[var(--color-fg-muted)]">
									{t.slug} · {t.legal_name}
								</p>
							</div>
							<div class="cluster cluster-tight">
								{#if canView && !isPlatform}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => openImpersonate(t)}
										aria-label="Impersonate {t.display_name}"
									>
										<Icon icon={Eye} size="sm" /> Impersonate
									</Button>
								{/if}
								<a
									href="/operator/tenants/{t.id}"
									class="label text-[var(--color-primary)] hover:underline">Open →</a
								>
							</div>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>

		{#if totalPages > 1}
			<nav class="cluster cluster-spread" aria-label="Tenant list pagination">
				<p class="caption text-[var(--color-fg-muted)]">
					{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
				</p>
				<div class="cluster cluster-tight">
					<Button
						variant="ghost"
						size="sm"
						disabled={page <= 1}
						onclick={() => (page -= 1)}
						aria-label="Previous page"
					>
						← Prev
					</Button>
					<span class="caption">Page {page} / {totalPages}</span>
					<Button
						variant="ghost"
						size="sm"
						disabled={page >= totalPages}
						onclick={() => (page += 1)}
						aria-label="Next page"
					>
						Next →
					</Button>
				</div>
			</nav>
		{/if}
	{/if}
</div>

<CreateTenantDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<ImpersonateModal
	bind:open={impersonateOpen}
	tenant={impersonateTarget}
	onOpenChange={(o) => (impersonateOpen = o)}
/>
```

---

## Task 12 — Migrate `CreateTenantDrawer.svelte` to mutation hook

**Files:**

- Modify: `src/lib/features/operator/tenants/components/CreateTenantDrawer.svelte`

- [ ] **Step 12.1: Replace CreateTenantDrawer.svelte**

```svelte
<script lang="ts">
	import { Drawer, Button, Alert, Card } from '$ui';
	import { toast } from '$ui';
	import { TextField, PasswordField } from '$lib/components/form';
	import { Copy, Icon } from '$icons';
	import { registerTenantMutation } from '$features/operator/tenants/queries';
	import type {
		RegisterTenantRequest,
		RegisterTenantResponse
	} from '$features/operator/tenants/types';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	let slug = $state('');
	let legalName = $state('');
	let displayName = $state('');
	let adminEmail = $state('');
	let adminPassword = $state('');
	let adminFirstName = $state('');
	let adminLastName = $state('');
	let formError = $state<string | null>(null);
	let credentials = $state<{
		email: string;
		password: string;
		tenantId: string;
		slug: string;
		displayName: string;
	} | null>(null);

	const registerMutation = registerTenantMutation();

	function reset() {
		slug = '';
		legalName = '';
		displayName = '';
		adminEmail = '';
		adminPassword = '';
		adminFirstName = '';
		adminLastName = '';
		formError = null;
		credentials = null;
	}

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		const req: RegisterTenantRequest = {
			slug: slug.trim().toLowerCase(),
			legal_name: legalName.trim(),
			display_name: displayName.trim(),
			admin_email: adminEmail.trim(),
			admin_password: adminPassword,
			admin_first_name: adminFirstName.trim(),
			admin_last_name: adminLastName.trim()
		};
		$registerMutation.mutate(req, {
			onSuccess: (resp: RegisterTenantResponse) => {
				credentials = {
					email: req.admin_email,
					password: req.admin_password,
					tenantId: resp.tenant_id,
					slug: req.slug,
					displayName: req.display_name
				};
				toast('success', `Tenant ${req.display_name} registered`);
			},
			onError: (err: unknown) => {
				formError = err instanceof Error ? err.message : 'Failed to register tenant';
			}
		});
	}

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			/* clipboard write may fail in older browsers; no-op */
		}
	}

	function handleClose(next: boolean) {
		if (!next) reset();
		onOpenChange(next);
	}

	const isPending = $derived($registerMutation.isPending);
</script>

<Drawer.Root bind:open onOpenChange={handleClose}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Register tenant</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Creates the tenant + a CompanyOwner membership for the seed admin. The admin signs in with
					the credentials below.
				</p>
			</div>
			<Drawer.Close>
				<button
					type="button"
					class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]"
					aria-label="Close">×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			{#if credentials}
				<Alert variant="success">
					<strong>{credentials.displayName}</strong> registered (<code>{credentials.slug}</code>).
					Share these credentials with the seed admin (one-time view — not retrievable):
				</Alert>
				<Card.Root class="mt-4">
					<Card.Content class="stack stack-tight">
						<div class="cluster cluster-spread">
							<span class="caption text-[var(--color-fg-muted)]">Tenant ID</span>
							<div class="cluster cluster-tight">
								<code class="caption text-[var(--color-fg-subtle)]">{credentials.tenantId}</code>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Copy tenant ID"
									onclick={() => copy(credentials!.tenantId)}
								>
									<Icon icon={Copy} size="sm" />
								</Button>
							</div>
						</div>
						<div class="cluster cluster-spread">
							<span class="caption text-[var(--color-fg-muted)]">Email</span>
							<div class="cluster cluster-tight">
								<code class="label">{credentials.email}</code>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Copy email"
									onclick={() => copy(credentials!.email)}
								>
									<Icon icon={Copy} size="sm" />
								</Button>
							</div>
						</div>
						<div class="cluster cluster-spread">
							<span class="caption text-[var(--color-fg-muted)]">Password</span>
							<div class="cluster cluster-tight">
								<code class="label">{credentials.password}</code>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Copy password"
									onclick={() => copy(credentials!.password)}
								>
									<Icon icon={Copy} size="sm" />
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
				<p class="caption mt-4 text-[var(--color-warning-900)]">
					This password forces a change on first sign-in. Share via a secure channel only.
				</p>
				<div class="cluster mt-4">
					<Button variant="ghost" onclick={reset}>Register another</Button>
					<a
						href="/operator/tenants/{credentials.tenantId}"
						class="label text-[var(--color-primary)] hover:underline">View tenant →</a
					>
					<Button onclick={() => handleClose(false)}>Done</Button>
				</div>
			{:else}
				<form id="register-tenant-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
					<TextField
						label="Slug"
						name="slug"
						bind:value={slug}
						required
						maxlength={60}
						placeholder="acme-pharma"
					/>
					<TextField
						label="Legal name"
						name="legal_name"
						bind:value={legalName}
						required
						maxlength={200}
					/>
					<TextField
						label="Display name"
						name="display_name"
						bind:value={displayName}
						required
						maxlength={200}
					/>
					<h3 class="mt-2 overline">Seed admin</h3>
					<TextField
						label="First name"
						name="admin_first_name"
						bind:value={adminFirstName}
						required
						maxlength={120}
					/>
					<TextField
						label="Last name"
						name="admin_last_name"
						bind:value={adminLastName}
						required
						maxlength={120}
					/>
					<TextField
						label="Email"
						name="admin_email"
						type="email"
						bind:value={adminEmail}
						required
					/>
					<PasswordField
						label="Initial password"
						name="admin_password"
						bind:value={adminPassword}
						required
						minlength={8}
					/>
					{#if formError}<Alert variant="danger">{formError}</Alert>{/if}
				</form>
			{/if}
		</Drawer.Body>
		{#if !credentials}
			<Drawer.Footer>
				<Drawer.Close>
					<Button variant="ghost" disabled={isPending}>Cancel</Button>
				</Drawer.Close>
				<Button type="submit" form="register-tenant-form" loading={isPending}
					>Register tenant</Button
				>
			</Drawer.Footer>
		{/if}
	</Drawer.Content>
</Drawer.Root>
```

---

## Task 13 — Migrate `SuspendDialog.svelte` to mutation hook

**Files:**

- Modify: `src/lib/features/operator/tenants/components/SuspendDialog.svelte`

- [ ] **Step 13.1: Replace SuspendDialog.svelte**

```svelte
<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { toast } from '$ui';
	import { suspendTenantMutation } from '$features/operator/tenants/queries';
	import type { TenantDto } from '$features/operator/tenants/types';

	type Props = { open: boolean; tenant: TenantDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	let reason = $state('');
	let formError = $state<string | null>(null);

	const suspendMutation = suspendTenantMutation();
	const isPending = $derived($suspendMutation.isPending);

	async function onConfirm() {
		if (!tenant) return;
		formError = null;
		$suspendMutation.mutate(
			{ id: tenant.id, reason: reason.trim() },
			{
				onSuccess: () => {
					toast('success', `${tenant!.display_name} suspended`);
					reason = '';
					onOpenChange(false);
				},
				onError: (err: unknown) => {
					formError = err instanceof Error ? err.message : 'Failed to suspend';
				}
			}
		);
	}
</script>

<ConfirmDialog
	bind:open
	title="Suspend {tenant?.display_name ?? 'tenant'}"
	description="All tenant users will be unable to sign in until the tenant is reactivated. Active sessions are revoked server-side."
	confirmLabel="Suspend tenant"
	variant="danger"
	loading={isPending}
	{onOpenChange}
	{onConfirm}
>
	{#snippet body()}
		<label class="stack stack-tight">
			<span class="label">Reason (required, audited)</span>
			<textarea
				bind:value={reason}
				required
				minlength={1}
				maxlength={500}
				rows={3}
				class="glass-input w-full rounded-md px-3 py-2 text-sm"
			></textarea>
		</label>
		{#if formError}<Alert variant="danger">{formError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
```

---

## Task 14 — Migrate `MarkForDeletionDialog.svelte` to mutation hook

**Files:**

- Modify: `src/lib/features/operator/tenants/components/MarkForDeletionDialog.svelte`

- [ ] **Step 14.1: Replace MarkForDeletionDialog.svelte**

```svelte
<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { toast } from '$ui';
	import { markForDeletionMutation } from '$features/operator/tenants/queries';
	import type { TenantDto } from '$features/operator/tenants/types';

	type Props = { open: boolean; tenant: TenantDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	let reason = $state('');
	let formError = $state<string | null>(null);

	const markMutation = markForDeletionMutation();
	const isPending = $derived($markMutation.isPending);

	async function onConfirm() {
		if (!tenant) return;
		formError = null;
		$markMutation.mutate(
			{ id: tenant.id, reason: reason.trim() },
			{
				onSuccess: () => {
					toast('success', `${tenant!.display_name} marked for deletion`);
					reason = '';
					onOpenChange(false);
				},
				onError: (err: unknown) => {
					formError = err instanceof Error ? err.message : 'Failed to mark for deletion';
				}
			}
		);
	}
</script>

<ConfirmDialog
	bind:open
	title="Mark {tenant?.display_name ?? 'tenant'} for deletion"
	description="Schedules the tenant for permanent deletion. Reversible via Restore for 30 days; after that, the tenant is anonymised and unrecoverable."
	confirmLabel="Mark for deletion"
	variant="danger"
	loading={isPending}
	{onOpenChange}
	{onConfirm}
>
	{#snippet body()}
		<label class="stack stack-tight">
			<span class="label">Reason (required, audited)</span>
			<textarea
				bind:value={reason}
				required
				minlength={1}
				maxlength={500}
				rows={3}
				class="glass-input w-full rounded-md px-3 py-2 text-sm"
			></textarea>
		</label>
		<Alert variant="warning">Reversible for 30 days via Restore.</Alert>
		{#if formError}<Alert variant="danger">{formError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
```

- [ ] **Step 14.2: Verify `npm run check` passes**

```bash
cd d:/Development/leadkart-web && npm run check 2>&1 | tail -30
```

Expected: 0 new type errors.

- [ ] **Step 14.3: Verify `npm run build` passes**

```bash
cd d:/Development/leadkart-web && npm run build 2>&1 | tail -20
```

Expected: clean static build.

---

## Task 15 — Commit 4: Tenant list migration

- [ ] **Step 15.1: Stage and commit**

```bash
cd d:/Development/leadkart-web && git add src/lib/features/operator/tenants/queries.ts src/lib/features/operator/tenants/components/TenantsList.svelte src/lib/features/operator/tenants/components/CreateTenantDrawer.svelte src/lib/features/operator/tenants/components/SuspendDialog.svelte src/lib/features/operator/tenants/components/MarkForDeletionDialog.svelte && git commit -m "feat(operator/tenants): migrate list + create/suspend/mark/restore to TanStack Query"
```

---

## Task 16 — Create `myCapabilitiesQuery` placeholder

**Files:**

- Create: `src/lib/features/auth/queries.ts`

- [ ] **Step 16.1: Create the file**

```typescript
/**
 * Auth feature query hooks.
 *
 * myCapabilitiesQuery — bridge surface for server-driven capability discovery.
 *
 * TODAY: synthesizes the capability set from JWT claims via tier.ts.
 * The query wraps synchronous derivation in the TanStack Query cache so
 * the adoption path is clean — when backend ships
 * GET /v1/auth/me/capabilities (ADR 0038 N1), only the queryFn changes.
 *
 * Components should consume `myCapabilitiesQuery()` instead of importing
 * `session.principal` + `tier.ts` directly. Adoption is a follow-up —
 * this commit plants the hook; migration is incremental.
 */
import { createQuery } from '@tanstack/svelte-query';
import { session } from './stores/session.svelte';
import { tierOf } from './tier';
import type { PrincipalTier } from './tier';

export const capabilitiesKey = ['me', 'capabilities'] as const;

export type Capabilities = {
	tier: PrincipalTier;
	permissions: ReadonlyArray<string>;
	isPlatform: boolean;
	isSuperUser: boolean;
	tenantId: string | null;
	tenantSlug: string | null;
};

/**
 * Returns a TanStack Query for the current user's capability set.
 *
 * staleTime: 5 min — capabilities rarely change mid-session; background
 * refetch on window focus still fires to pick up permission updates.
 * gcTime: 30 min — keeps the result warm across route navigations.
 *
 * TODO(backend N1): replace queryFn body with:
 *   return api.getMyCapabilities();
 * when GET /v1/auth/me/capabilities ships.
 */
export function myCapabilitiesQuery() {
	return createQuery({
		queryKey: capabilitiesKey,
		queryFn: async (): Promise<Capabilities> => {
			// TODO(backend N1): replace with api.getMyCapabilities() once shipped.
			// This synthesizes the capability set from JWT claims — same data,
			// different source. Swap is a one-line change when backend ships.
			const principal = session.principal;
			return {
				tier: tierOf(principal),
				permissions: principal?.permissions ?? [],
				isPlatform: principal?.isPlatform ?? false,
				isSuperUser: principal?.isSuperUser ?? false,
				tenantId: principal?.tenantId ?? null,
				tenantSlug: principal?.tenantSlug ?? null
			};
		},
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000
	});
}

/**
 * Convenience helper — readable by components that just need a boolean
 * for a single permission check.
 *
 * Usage:
 *   const { data: caps } = myCapabilitiesQuery();
 *   const canSuspend = $derived(
 *     caps?.isSuperUser || (caps?.permissions ?? []).includes('platform.tenants.manage')
 *   );
 *
 * This pattern replaces direct `hasPermission(session.principal, perm)` calls.
 * Migration is a follow-up — adoption is incremental.
 */
export function hasCapability(caps: Capabilities | undefined, permission: string): boolean {
	if (!caps) return false;
	if (caps.isSuperUser) return true;
	return caps.permissions.includes(permission);
}
```

- [ ] **Step 16.2: Verify `npm run check` passes**

```bash
cd d:/Development/leadkart-web && npm run check 2>&1 | tail -20
```

Expected: 0 new type errors.

---

## Task 17 — Full CI gate

- [ ] **Step 17.1: Run lint**

```bash
cd d:/Development/leadkart-web && npm run lint 2>&1 | tail -20
```

Expected: 0 errors. If prettier complains, run `npm run format` then re-lint.

- [ ] **Step 17.2: Run type check**

```bash
cd d:/Development/leadkart-web && npm run check 2>&1 | tail -20
```

Expected: 0 errors.

- [ ] **Step 17.3: Run test coverage**

```bash
cd d:/Development/leadkart-web && npm run test:coverage 2>&1 | tail -30
```

Expected: pass. If any test fails due to TanStack Query (e.g. `operatorTenants` store still imported somewhere), fix the import.

- [ ] **Step 17.4: Run build**

```bash
cd d:/Development/leadkart-web && npm run build 2>&1 | tail -20
```

Expected: successful static build.

- [ ] **Step 17.5: List Playwright tests (non-destructive check)**

```bash
cd d:/Development/leadkart-web && npx playwright test --list 2>&1 | tail -20
```

Expected: test list printed, no config errors.

---

## Task 18 — Commit 5: capabilities query + push

- [ ] **Step 18.1: Stage and commit**

```bash
cd d:/Development/leadkart-web && git add src/lib/features/auth/queries.ts && git commit -m "feat(auth): myCapabilitiesQuery placeholder + Phase B summary"
```

- [ ] **Step 18.2: Push branch**

```bash
cd d:/Development/leadkart-web && git push origin feat/theme-customizer
```

Expected: remote updated.

---

## Self-review

### Spec coverage

| Spec requirement                                       | Task covering it                           |
| ------------------------------------------------------ | ------------------------------------------ |
| §B.1.2 — typed error subclasses                        | Tasks 1–4                                  |
| §B.1.2 — RFC 9457 mapping in client.ts                 | Task 3                                     |
| Unit tests: NetworkError on fetch rejection            | Task 1 (errors.test.ts)                    |
| Unit tests: ValidationError fields                     | Task 1                                     |
| Unit tests: AuthError 401 vs 403                       | Task 1                                     |
| Unit tests: legacy body no-crash                       | Task 1                                     |
| §B.1.1 — TanStack Query install                        | Task 5                                     |
| §B.1.1 — QueryClient config (stale/retry)              | Task 5                                     |
| §B.1.1 — QueryClientProvider in layout                 | Task 6                                     |
| §B.1.6 — Toaster singleton                             | Task 7                                     |
| `--z-toast` token exists                               | Task 7.3 (verify; already present at 1500) |
| `toast` re-exported from `$ui`                         | Task 7.2                                   |
| Toaster mounted in layout                              | Task 6                                     |
| queries.ts — tenantsListQuery                          | Task 10                                    |
| queries.ts — suspendTenantMutation                     | Task 10                                    |
| queries.ts — activateTenantMutation                    | Task 10                                    |
| queries.ts — markForDeletionMutation                   | Task 10                                    |
| queries.ts — restoreTenantMutation                     | Task 10                                    |
| queries.ts — registerTenantMutation                    | Task 10                                    |
| TenantsList.svelte migrated                            | Task 11                                    |
| CreateTenantDrawer.svelte migrated                     | Task 12                                    |
| SuspendDialog.svelte migrated                          | Task 13                                    |
| MarkForDeletionDialog.svelte migrated                  | Task 14                                    |
| OperatorTenantsStore NOT deleted                       | Not touched (correct)                      |
| toast() on mutation success                            | Tasks 12, 13, 14                           |
| NetworkError retry button in list                      | Task 11                                    |
| §B.1.5 — myCapabilitiesQuery placeholder               | Task 16                                    |
| CI gate: lint + check + test + build + playwright list | Task 17                                    |
| Push                                                   | Task 18                                    |

### Deviation notes

1. **Commits 2 + 3 merged**: QueryClient provider and Toaster both touch `+layout.svelte`. Rather than staging two separate commits that each leave the layout in a broken state (one import references the not-yet-created Toaster), they ship together. Task 9 documents the split procedure if strict separation is needed.

2. **`ApiErrorBody` type removed from `client.ts` import**: The new `errors.ts` accepts `ApiErrorBody | null` internally inside `fromResponse`. The `client.ts` no longer needs to import the type — `fromResponse` hides the shape concern. This is a simplification, not a regression.

3. **`animate-slide-in-right` in Toaster**: This Tailwind utility is referenced in the spec. If the utility is not defined in `src/styles/animations.css`, the toast appears without animation (no runtime error). Verify it exists; if not, add it to animations.css as a one-line `@keyframes slide-in-right` + utility class.
