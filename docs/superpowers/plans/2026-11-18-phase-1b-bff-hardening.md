# Phase 1b: BFF security hardening + P0 crash fixes. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to work through this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the security holes and session bugs found in the 2026-11-17 review of the SvelteKit BFF, and fix the three P0 UI defects, without changing any user-visible flow.

**Architecture:** Every security decision moves into small pure helpers under `src/lib/server/` (`redirect.ts`, `auth-refresh.ts`, `proxy.ts`, `scope.ts`, `guards.ts`), each unit-tested with Vitest. Route files (`+server.ts`, `+layout.server.ts`, `+page.server.ts`) only wire those helpers. Each helper has one owner: the proxy, the layout load and the login routes all call the same `refreshSession` / `setAuthCookies`, so there is one refresh implementation instead of today's two copies.

**Tech stack:** SvelteKit 3.3 (adapter-node 6), TypeScript 6, Zod 4, Vitest 4, Playwright, `node:crypto`.

**Spec:** `docs/superpowers/specs/2026-11-18-platform-upgrade-ui-foundation-design.md` §4.2. Deviations from the spec, decided while planning:

- Preferences-cookie SSR stays in Phase 2. The CSP is unblocked now by putting `nonce="%sveltekit.nonce%"` on the inline theme script in `app.html`.
- The operator-scope cookie is HMAC-signed and UUID-validated, and is cleared on login, logout and refresh failure. It is not bound to a person id (the BFF never decodes the JWT); clearing on login gives the same protection.
- Impersonation: the browser never uses the `access_token` the Go API returns (the store keeps only `session_id`), so the proxy scrubs token fields from that response. No new cookie flow.
- Capability guards keep today's behaviour (redirect to `/dashboard`) but run on the server, so no page flashes and no data loads first.

## Global constraints

- Repo `D:\Development\leadkart-web`, branch `feat/kit3-hardening`. **No worktrees.**
- Imports use explicit extensions and `#lib` (`import { x } from '#lib/server/config.ts'`). Custom aliases `$features`, `$api`, `$ui`, `$form`, `$icons`, `$layouts` stay. Cross-feature imports go through the feature barrel (`$features/<x>`) only.
- **Reuse first (owner's top priority):** never copy a helper. If two call sites need the same logic, both call one function.
- Server code never imports a `.svelte` file or a barrel that re-exports components.
- Vitest runs from PowerShell with cwd `D:\Development\leadkart-web` (uppercase `D`). From Git Bash every suite fails with `Cannot read properties of undefined (reading 'config')`.
- Playwright always runs as `CI=1 npx playwright test --project=chromium --retries=0 …` (fresh servers; fails if ports 4173/9999 are busy). After any e2e run, confirm both ports are free.
- Gate set before every commit: `npm run check`, `npm run lint`, `npm run lint:deps`, `npm run lint:dead`, `npm run arch:check`, `npm run test`, `npm run build`. All green.
- Husky runs on commit; never `--no-verify`. Commit messages end with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- Error JSON from BFF routes keeps the existing shape `{ error: string, message?: string }`.
- Cookie names: `lk_access` / `__Host-lk_access` (prod), `lk_refresh`, `lk_csrf`, `lk_op_tenant`, new `lk_mcp`.

---

### Task 1: `safeRedirectPath` (open-redirect fix)

**Files:**

- Create: `src/lib/server/redirect.ts`
- Test: `tests/unit/server/redirect.test.ts`
- Modify: `src/routes/(auth)/signin/+page.server.ts` (delete local `safeNextPath`, lines 30-35 and the `target` expression)
- Modify: `src/routes/(app)/must-change-password/+page.server.ts` (delete local `safeNextPath`)

**Interfaces:**

- Produces: `safeRedirectPath(raw: string | null | undefined, origin: string, fallback?: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/redirect.test.ts
import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '#lib/server/redirect.ts';

const origin = 'https://app.leadkart.test';

describe('safeRedirectPath', () => {
	it('falls back when the value is missing', () => {
		expect(safeRedirectPath(null, origin)).toBe('/dashboard');
		expect(safeRedirectPath('', origin)).toBe('/dashboard');
	});

	it('keeps a same-origin path with query and hash', () => {
		expect(safeRedirectPath('/leads?stage=new#top', origin)).toBe('/leads?stage=new#top');
	});

	it.each([
		['protocol-relative', '//evil.com'],
		['backslash (browsers read /\\ as //)', '/\\evil.com'],
		['tab inside the slashes', '/\t/evil.com'],
		['absolute URL', 'https://evil.com/x'],
		['javascript scheme', 'javascript:alert(1)'],
		['no leading slash', 'leads'],
		['newline', '/leads\nSet-Cookie: x=1'],
		['dot segment that normalises to //', '/.//evil.com'],
		['dot-dot segment that normalises to //', '/..//evil.com'],
		['encoded dot segment (sent as %252e)', '/%2e//evil.com'],
		['parent traversal that normalises to //', '/a/..//evil.com']
	])('rejects %s', (_label, value) => {
		expect(safeRedirectPath(value, origin)).toBe('/dashboard');
	});

	it('uses the caller-supplied fallback', () => {
		expect(safeRedirectPath('//evil.com', origin, '/signin')).toBe('/signin');
	});
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run (PowerShell): `npx vitest run tests/unit/server/redirect.test.ts`
Expected: FAIL, module `#lib/server/redirect.ts` not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/server/redirect.ts
/**
 * Open-redirect guard for `?next=` style parameters.
 *
 * `raw` must already be URL-decoded once (it is, when read through
 * `url.searchParams.get`). Never decode it again here: a second decode is
 * how `%252F%252Fevil.com` turns into `//evil.com`.
 *
 * Browsers normalise backslashes and strip tab/newline inside a URL, so
 * `/\evil.com` and `/<TAB>/evil.com` both navigate to `//evil.com`. Those
 * characters are rejected outright before parsing.
 */
const UNSAFE_CHARS = /[\\\u0000-\u001f\u007f]/;

export function safeRedirectPath(
	raw: string | null | undefined,
	origin: string,
	fallback = '/dashboard'
): string {
	if (!raw) return fallback;
	if (UNSAFE_CHARS.test(raw)) return fallback;
	if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;

	let url: URL;
	try {
		url = new URL(raw, origin);
	} catch {
		return fallback;
	}
	if (url.origin !== origin) return fallback;

	// Validate the OUTPUT too: dot-segment normalisation turns `/.//evil.com`
	// and `/%2e//evil.com` into `//evil.com`, which a browser reads as another host.
	const path = url.pathname + url.search + url.hash;
	if (!path.startsWith('/') || path.startsWith('//')) return fallback;
	return path;
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run tests/unit/server/redirect.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Wire both call sites**

In `src/routes/(auth)/signin/+page.server.ts`: delete the local `safeNextPath` function, import `safeRedirectPath` from `#lib/server/redirect.ts`, and replace the `target` expression with:

```ts
const next = safeRedirectPath(url.searchParams.get('next'), url.origin);
const target = tokens.must_change_password
	? `/must-change-password?next=${encodeURIComponent(next)}`
	: next;
```

In `src/routes/(app)/must-change-password/+page.server.ts`: delete the local `safeNextPath`, import the helper, and replace `safeNextPath(url.searchParams.get('next'))` with `safeRedirectPath(url.searchParams.get('next'), url.origin)`.

Confirm no copy is left: `grep -rn "safeNextPath" src` prints nothing.

- [ ] **Step 6: Gates and commit**

```bash
git add -A
git commit -m "fix(security): safeRedirectPath closes open redirect on signin + must-change-password"
```

---

### Task 2: Config fails closed + new secrets

**Files:**

- Modify: `src/lib/server/config.ts`
- Modify: `.env.example`, `playwright.config.ts` (webServer env), `tests/unit/stubs/` (only if a config stub exists)
- Test: `tests/unit/server/config.test.ts`

**Interfaces:**

- Produces: `config.SCOPE_COOKIE_SECRET: string`, `config.UPSTREAM_TIMEOUT_MS: number`, `isProd(): boolean` (unchanged signature; now true when `NODE_ENV` is unset).

- [ ] **Step 1: Write the failing test.** `config.ts` reads env through the project's env module (see its imports at HEAD). Export the Zod `schema` as `configSchema` so it can be tested without module mocking:

```ts
// tests/unit/server/config.test.ts
import { describe, expect, it } from 'vitest';
import { configSchema } from '#lib/server/config.ts';

const base = { GO_API_URL: 'http://localhost:8080' };

describe('configSchema', () => {
	it('defaults NODE_ENV to production (fail closed)', () => {
		const out = configSchema.safeParse({ ...base, SCOPE_COOKIE_SECRET: 'x'.repeat(32) });
		expect(out.success && out.data.NODE_ENV).toBe('production');
	});

	it('requires a 32+ char SCOPE_COOKIE_SECRET in production', () => {
		expect(configSchema.safeParse({ ...base, NODE_ENV: 'production' }).success).toBe(false);
		expect(
			configSchema.safeParse({ ...base, NODE_ENV: 'production', SCOPE_COOKIE_SECRET: 'short' })
				.success
		).toBe(false);
	});

	it('supplies a dev-only secret outside production', () => {
		const out = configSchema.safeParse({ ...base, NODE_ENV: 'development' });
		expect(out.success && out.data.SCOPE_COOKIE_SECRET.length).toBeGreaterThanOrEqual(32);
	});

	it('rejects a non-https ORIGIN in production', () => {
		const out = configSchema.safeParse({
			...base,
			NODE_ENV: 'production',
			SCOPE_COOKIE_SECRET: 'x'.repeat(32),
			ORIGIN: 'http://app.example.com'
		});
		expect(out.success).toBe(false);
	});

	it('defaults the upstream timeout to 10 s', () => {
		const out = configSchema.safeParse({ ...base, NODE_ENV: 'test' });
		expect(out.success && out.data.UPSTREAM_TIMEOUT_MS).toBe(10_000);
	});
});
```

- [ ] **Step 2: Run it and confirm it fails** (`configSchema` is not exported; defaults differ).

- [ ] **Step 3: Implement.** Replace the schema in `src/lib/server/config.ts` with:

```ts
const DEV_SCOPE_SECRET = 'dev-only-scope-cookie-secret-not-for-production';

export const configSchema = z
	.object({
		GO_API_URL: z.string().url('GO_API_URL must be a valid URL (e.g. http://localhost:8080)'),
		/**
		 * Fail closed: an unset NODE_ENV means production, so cookies get
		 * `Secure` and the `__Host-` prefix. Local dev and tests set it
		 * explicitly (Vite dev sets 'development'; playwright sets 'test').
		 */
		NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
		/** HMAC key for the operator-scope cookie. Required in production. */
		SCOPE_COOKIE_SECRET: z.string().min(32).optional(),
		/** Public origin, as given to adapter-node. Checked only when set. */
		ORIGIN: z.string().url().optional(),
		/** Timeout for every BFF → Go request. */
		UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000)
	})
	.superRefine((v, ctx) => {
		if (v.NODE_ENV !== 'production') return;
		if (!v.SCOPE_COOKIE_SECRET) {
			ctx.addIssue({
				code: 'custom',
				path: ['SCOPE_COOKIE_SECRET'],
				message: 'SCOPE_COOKIE_SECRET (32+ chars) is required in production'
			});
		}
		if (v.ORIGIN && !v.ORIGIN.startsWith('https://')) {
			ctx.addIssue({
				code: 'custom',
				path: ['ORIGIN'],
				message: 'ORIGIN must be https in production'
			});
		}
	})
	.transform((v) => ({ ...v, SCOPE_COOKIE_SECRET: v.SCOPE_COOKIE_SECRET ?? DEV_SCOPE_SECRET }));

export type Config = z.infer<typeof configSchema>;
```

Pass the two new keys (`SCOPE_COOKIE_SECRET`, `ORIGIN`, `UPSTREAM_TIMEOUT_MS`) into `safeParse` inside `load()` from the same env source as `GO_API_URL`. Update the `NODE_ENV` doc comment to describe the fail-closed default.

- [ ] **Step 4: Make dev and e2e explicit.** In `.env.example` set `NODE_ENV=development`, and add documented entries for `SCOPE_COOKIE_SECRET` (generate with `openssl rand -base64 48`), `UPSTREAM_TIMEOUT_MS`, and the adapter variables `ORIGIN`, `PROTOCOL_HEADER`, `HOST_HEADER` (note: behind a TLS-terminating proxy without these, SvelteKit's origin check rejects every form action with 403). In `playwright.config.ts`, make sure the `node build/index.js` webServer `env` sets `NODE_ENV: 'test'` (add it if missing).

- [ ] **Step 5: Run the tests** (`npx vitest run tests/unit/server/config.test.ts` → 5 pass), then gates.

- [ ] **Step 6: Commit**

```bash
git commit -am "fix(security): config fails closed — secure cookies by default, scope secret + https origin required in prod"
```

---

### Task 3: Working refresh flow (one implementation, single-flight)

**Files:**

- Modify: `src/lib/server/cookies.ts`
- Create: `src/lib/server/auth-refresh.ts`
- Test: `tests/unit/server/auth-refresh.test.ts`, `tests/unit/server/cookies.test.ts`
- Modify: `src/routes/api/[...path]/+server.ts` (delete `tryRefresh`), `src/routes/(app)/+layout.server.ts` (delete `tryRefreshServerSide`), `src/routes/auth/login/+server.ts`, `src/routes/(auth)/signin/+page.server.ts`, `src/routes/auth/logout/+server.ts`
- Test: `tests/e2e/session-refresh.spec.ts`

**Interfaces:**

- Consumes: `config.GO_API_URL`, `config.UPSTREAM_TIMEOUT_MS` (Task 2); `clearOperatorScope` from `scope.ts`.
- Produces:
  - `cookies.ts`: `REFRESH_COOKIE`, `CSRF_COOKIE`, `MCP_COOKIE` constants; `setAuthCookies(cookies, access, refresh)`; `clearAuthCookies(cookies)`; `setMustChangePassword(cookies, on: boolean)`; `mustChangePassword(cookies): boolean`.
  - `auth-refresh.ts`: `tokenPairSchema`, `type TokenPair`, `refreshTokens(refresh, fetchFn?): Promise<RefreshResult>` where `RefreshResult = { ok: true; tokens: TokenPair } | { ok: false; reason: 'rejected' | 'unavailable' }`; `refreshSession(cookies, fetchFn?): Promise<string | null>` (returns the new access token); `establishSession(cookies, tokens)`.

**Why:** `lk_refresh` was set with `Path=/auth/refresh`, a path with no route, so the browser never sent it anywhere. Silent refresh never worked and logout never revoked. The refresh token now uses `Path=/` (still httpOnly, `SameSite=Strict`, `Secure` in prod). `lk_csrf` gets the refresh lifetime, so mutations keep working after the first 15 minutes.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/server/auth-refresh.test.ts
import { describe, expect, it, vi } from 'vitest';
import { refreshTokens } from '#lib/server/auth-refresh.ts';

const ok = (body: unknown) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
const pair = { access_token: 'a1', refresh_token: 'r1' };

describe('refreshTokens', () => {
	it('returns the parsed pair on 200', async () => {
		const fetchFn = vi.fn(async () => ok(pair));
		expect(await refreshTokens('rt-ok', fetchFn)).toEqual({ ok: true, tokens: pair });
	});

	it('single-flights concurrent calls for the same token', async () => {
		const fetchFn = vi.fn(async () => ok(pair));
		const [a, b, c] = await Promise.all([
			refreshTokens('rt-same', fetchFn),
			refreshTokens('rt-same', fetchFn),
			refreshTokens('rt-same', fetchFn)
		]);
		expect(fetchFn).toHaveBeenCalledTimes(1);
		expect(a).toEqual(b);
		expect(b).toEqual(c);
	});

	it('reuses the result for a late request inside the grace window', async () => {
		const fetchFn = vi.fn(async () => ok(pair));
		await refreshTokens('rt-grace', fetchFn);
		await refreshTokens('rt-grace', fetchFn);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it('reports rejected on 401', async () => {
		const fetchFn = vi.fn(async () => new Response('{}', { status: 401 }));
		expect(await refreshTokens('rt-401', fetchFn)).toEqual({ ok: false, reason: 'rejected' });
	});

	it('reports unavailable on network failure', async () => {
		const fetchFn = vi.fn(async () => {
			throw new TypeError('fetch failed');
		});
		expect(await refreshTokens('rt-net', fetchFn)).toEqual({ ok: false, reason: 'unavailable' });
	});

	it('reports unavailable on 5xx and on a malformed 200 body', async () => {
		expect(
			await refreshTokens(
				'rt-500',
				vi.fn(async () => new Response('', { status: 503 }))
			)
		).toEqual({
			ok: false,
			reason: 'unavailable'
		});
		expect(
			await refreshTokens(
				'rt-bad',
				vi.fn(async () => ok({ access_token: '' }))
			)
		).toEqual({
			ok: false,
			reason: 'unavailable'
		});
	});
});
```

```ts
// tests/unit/server/cookies.test.ts
import { describe, expect, it } from 'vitest';
import { clearAuthCookies, setAuthCookies } from '#lib/server/cookies.ts';

type Call = { name: string; value?: string; opts: Record<string, unknown> };
function fakeCookies() {
	const sets: Call[] = [];
	const deletes: Call[] = [];
	return {
		sets,
		deletes,
		jar: {
			set: (name: string, value: string, opts: Record<string, unknown>) =>
				sets.push({ name, value, opts }),
			delete: (name: string, opts: Record<string, unknown>) => deletes.push({ name, opts }),
			get: () => undefined
		} as never
	};
}

describe('auth cookies', () => {
	it('sets the refresh cookie on Path=/ so the proxy, layout and logout receive it', () => {
		const c = fakeCookies();
		setAuthCookies(c.jar, 'acc', 'ref');
		const refresh = c.sets.find((s) => s.name === 'lk_refresh');
		expect(refresh?.opts).toMatchObject({ path: '/', httpOnly: true, sameSite: 'strict' });
	});

	it('gives the csrf cookie the refresh lifetime, not the access lifetime', () => {
		const c = fakeCookies();
		setAuthCookies(c.jar, 'acc', 'ref');
		const csrf = c.sets.find((s) => s.name === 'lk_csrf');
		const refresh = c.sets.find((s) => s.name === 'lk_refresh');
		expect(csrf?.opts.maxAge).toBe(refresh?.opts.maxAge);
		expect(csrf?.opts.httpOnly).toBe(false);
	});

	it('clears the refresh cookie on both the new and the legacy path', () => {
		const c = fakeCookies();
		clearAuthCookies(c.jar);
		const paths = c.deletes.filter((d) => d.name === 'lk_refresh').map((d) => d.opts.path);
		expect(paths).toEqual(expect.arrayContaining(['/', '/auth/refresh']));
	});
});
```

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement `cookies.ts`.** Keep the header comment (update the path note), and make the body:

```ts
export const ACCESS_COOKIE = (): string => (isProd() ? '__Host-lk_access' : 'lk_access');
export const REFRESH_COOKIE = 'lk_refresh';
export const CSRF_COOKIE = 'lk_csrf';
export const MCP_COOKIE = 'lk_mcp';

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 3600;
/** Path used before 2026-11; cleared on logout so stale cookies disappear. */
const LEGACY_REFRESH_PATH = '/auth/refresh';

export function setAuthCookies(cookies: Cookies, access: string, refresh: string): void {
	const secure = isProd();
	cookies.set(ACCESS_COOKIE(), access, {
		path: '/',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: ACCESS_MAX_AGE
	});
	// Path=/ so the proxy, the (app) layout and /auth/logout all receive it.
	cookies.set(REFRESH_COOKIE, refresh, {
		path: '/',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: REFRESH_MAX_AGE
	});
	// Lives as long as the session: a 15-minute csrf cookie made every
	// mutation fail with 403 once the first access token expired.
	const csrf = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
	cookies.set(CSRF_COOKIE, csrf, {
		path: '/',
		httpOnly: false,
		secure,
		sameSite: 'strict',
		maxAge: REFRESH_MAX_AGE
	});
}

export function clearAuthCookies(cookies: Cookies): void {
	cookies.delete(ACCESS_COOKIE(), { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: LEGACY_REFRESH_PATH });
	cookies.delete(CSRF_COOKIE, { path: '/' });
	cookies.delete(MCP_COOKIE, { path: '/' });
}

/** Forced password change pending (set at login, cleared on success). */
export function setMustChangePassword(cookies: Cookies, on: boolean): void {
	if (!on) {
		cookies.delete(MCP_COOKIE, { path: '/' });
		return;
	}
	cookies.set(MCP_COOKIE, '1', {
		path: '/',
		httpOnly: true,
		secure: isProd(),
		sameSite: 'strict',
		maxAge: REFRESH_MAX_AGE
	});
}

export function mustChangePassword(cookies: Cookies): boolean {
	return cookies.get(MCP_COOKIE) === '1';
}
```

Rotating the csrf value on every refresh would break requests already in flight with the old header, so `refreshSession` (below) sets only the access and refresh cookies when a csrf cookie already exists. Add an optional fourth parameter for that: `setAuthCookies(cookies, access, refresh, opts: { keepCsrf?: boolean } = {})`, and skip the csrf `cookies.set` when `opts.keepCsrf && cookies.get(CSRF_COOKIE)`. Add a unit test for it.

- [ ] **Step 4: Implement `auth-refresh.ts`**

```ts
// src/lib/server/auth-refresh.ts
/**
 * The one implementation of token refresh for the BFF.
 *
 * Single-flight: concurrent 401s for the same refresh token share one
 * call to Go. Without this, each request rotates the same token and Go's
 * reuse detection revokes the whole session. The result is kept for a
 * short grace window so a request that was already in flight with the
 * old cookie gets the same new pair instead of a second rotation.
 *
 * The map is per process. With several BFF instances, Go must tolerate a
 * rotated token being presented again within a few seconds.
 */
import { createHash } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { z } from 'zod';
import { config } from './config.ts';
import {
	clearAuthCookies,
	REFRESH_COOKIE,
	setAuthCookies,
	setMustChangePassword
} from './cookies.ts';
import { clearOperatorScope } from './scope.ts';

export const tokenPairSchema = z.object({
	access_token: z.string().min(1),
	refresh_token: z.string().min(1),
	must_change_password: z.boolean().optional()
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

export type RefreshResult =
	| { ok: true; tokens: TokenPair }
	| { ok: false; reason: 'rejected' | 'unavailable' };

const GRACE_MS = 10_000;
const inflight = new Map<string, Promise<RefreshResult>>();

async function callRefresh(refresh: string, fetchFn: typeof fetch): Promise<RefreshResult> {
	let resp: Response;
	try {
		resp = await fetchFn(`${config.GO_API_URL}/api/v1/auth/refresh`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify({ refresh_token: refresh }),
			signal: AbortSignal.timeout(config.UPSTREAM_TIMEOUT_MS)
		});
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
	if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
		return { ok: false, reason: 'rejected' };
	}
	if (!resp.ok) return { ok: false, reason: 'unavailable' };

	const parsed = tokenPairSchema.safeParse(await resp.json().catch(() => null));
	return parsed.success ? { ok: true, tokens: parsed.data } : { ok: false, reason: 'unavailable' };
}

export function refreshTokens(
	refresh: string,
	fetchFn: typeof fetch = fetch
): Promise<RefreshResult> {
	const key = createHash('sha256').update(refresh).digest('hex');
	const existing = inflight.get(key);
	if (existing) return existing;

	const pending = callRefresh(refresh, fetchFn);
	inflight.set(key, pending);
	void pending.finally(() => {
		const timer = setTimeout(() => inflight.delete(key), GRACE_MS);
		timer.unref?.();
	});
	return pending;
}

/** Start a session from a login response. The one place login cookies are written. */
export function establishSession(cookies: Cookies, tokens: TokenPair): void {
	clearOperatorScope(cookies);
	setAuthCookies(cookies, tokens.access_token, tokens.refresh_token);
	setMustChangePassword(cookies, tokens.must_change_password === true);
}

/**
 * Refresh using the request's cookies. Returns the new access token, or
 * null. A rejected refresh token ends the session (all auth cookies and
 * the operator scope are cleared); an unreachable Go API leaves the
 * cookies alone so the next request can try again.
 */
export async function refreshSession(
	cookies: Cookies,
	fetchFn: typeof fetch = fetch
): Promise<string | null> {
	const refresh = cookies.get(REFRESH_COOKIE);
	if (!refresh) return null;

	const result = await refreshTokens(refresh, fetchFn);
	if (result.ok) {
		setAuthCookies(cookies, result.tokens.access_token, result.tokens.refresh_token, {
			keepCsrf: true
		});
		return result.tokens.access_token;
	}
	if (result.reason === 'rejected') {
		clearAuthCookies(cookies);
		clearOperatorScope(cookies);
	}
	return null;
}
```

- [ ] **Step 5: Run the unit tests** → all pass.

- [ ] **Step 6: Replace the two copies and wire login/logout**
  - `src/routes/api/[...path]/+server.ts`: delete `tryRefresh`. In the 401 branch: `const access = await refreshSession(event.cookies); if (access) return proxy(event, 2);`.
  - `src/routes/(app)/+layout.server.ts`: delete `tryRefreshServerSide`; use `refreshSession(cookies)`. **Also** attempt a refresh when the access cookie is missing but a refresh cookie exists (the access cookie expires after 15 minutes and simply disappears): `let access = cookies.get(ACCESS_COOKIE()) ?? (await refreshSession(cookies));`.
  - `src/routes/auth/login/+server.ts` and `src/routes/(auth)/signin/+page.server.ts`: parse the Go response with `tokenPairSchema.safeParse`; on failure return the route's existing "unexpected" error (502 / `auth.errors.unexpected`); on success call `establishSession(cookies, tokens)`. Remove the local `GoTokens` interface and the `as { access_token … }` casts.
  - `src/routes/auth/logout/+server.ts`: read `event.cookies.get(REFRESH_COOKIE)` (import the constant), add `signal: AbortSignal.timeout(config.UPSTREAM_TIMEOUT_MS)` to the revoke call.
  - Replace every remaining string literal `'lk_refresh'` / `'lk_csrf'` in `src/` with the constants: `grep -rn "'lk_refresh'\|'lk_csrf'" src` must only show `cookies.ts` and client code that cannot import server modules.

- [ ] **Step 7: Enforce forced password change in the (app) layout.** In `src/routes/(app)/+layout.server.ts`, after the access check:

```ts
if (mustChangePassword(cookies) && url.pathname !== '/must-change-password') {
	throw redirect(
		303,
		`/must-change-password?next=${encodeURIComponent(url.pathname + url.search)}`
	);
}
```

In `src/routes/(app)/must-change-password/+page.server.ts`, call `setMustChangePassword(cookies, false)` just before the success redirect. Do the same in the account-security change-password action (`src/routes/(app)/settings/account/security/+page.server.ts`) on success.

- [ ] **Step 8: Add the e2e test.** First extend the mock server so tests can see request bodies and force statuses (read `tests/e2e/mock-server/server.mjs` and the helpers in `tests/e2e/` to follow the existing control pattern). Then:

```ts
// tests/e2e/session-refresh.spec.ts
import { expect, test } from '@playwright/test';
// Use the project's existing signin + mock-control helpers; names below are
// the behaviours required, map them to the real helper functions.

test('expired access token is refreshed silently and the page still loads', async ({
	page,
	context
}) => {
	// 1. sign in through the UI
	// 2. delete the access cookie (simulates the 15-minute expiry)
	const cookies = await context.cookies();
	await context.clearCookies({ name: cookies.find((c) => c.name.endsWith('lk_access'))!.name });
	// 3. navigate to an (app) page
	await page.goto('/dashboard');
	// 4. still signed in, and Go's /v1/auth/refresh was called exactly once
	await expect(page).toHaveURL(/\/dashboard/);
	// expect(mock.calls('POST', '/api/v1/auth/refresh')).toHaveLength(1)
});

test('logout revokes the refresh token on the Go API', async ({ page }) => {
	// sign in, click sign out, then:
	// expect(mock.calls('POST', '/api/v1/auth/logout')[0].body.refresh_token).toBeTruthy()
});

test('a rejected refresh token ends the session', async ({ page, context }) => {
	// sign in, force the mock to answer 401 on /api/v1/auth/refresh, delete the access cookie,
	// goto /dashboard → redirected to /signin?next=%2Fdashboard, lk_refresh cookie gone
});
```

Replace each comment with real calls to the existing helpers; all three tests must contain real assertions (no commented-out expectations in the committed file).

- [ ] **Step 9: Run** `npm run build`, then `CI=1 npx playwright test tests/e2e/session-refresh.spec.ts --project=chromium --retries=0`. Expected: 3 pass. Confirm ports 4173 and 9999 are free afterwards.

- [ ] **Step 10: Gates and commit**

```bash
git add -A
git commit -m "fix(auth): working silent refresh — Path=/ refresh cookie, single-flight refreshSession, logout revokes, forced password change enforced"
```

---

### Task 4: Signed operator-scope cookie

**Files:**

- Modify: `src/lib/server/scope.ts`
- Modify: `src/routes/(app)/operator/scope/+layout.server.ts` (path built from `scope.id`)
- Test: `tests/unit/server/scope.test.ts`

**Interfaces:**

- Consumes: `config.SCOPE_COOKIE_SECRET` (Task 2).
- Produces: unchanged signatures `setOperatorScope(cookies, scope)`, `getOperatorScope(cookies): OperatorScope | null`, `clearOperatorScope(cookies)`. `getOperatorScope` now returns `null` for an unsigned, tampered or non-UUID value.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/scope.test.ts
import { describe, expect, it } from 'vitest';
import { getOperatorScope, setOperatorScope } from '#lib/server/scope.ts';

function jar(initial?: string) {
	let value = initial;
	return {
		get value() {
			return value;
		},
		api: {
			get: () => value,
			set: (_n: string, v: string) => {
				value = v;
			},
			delete: () => {
				value = undefined;
			}
		} as never
	};
}
const scope = {
	id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
	slug: 'acme',
	display_name: 'Acme Pharma'
};

describe('operator scope cookie', () => {
	it('round-trips a signed value', () => {
		const j = jar();
		setOperatorScope(j.api, scope);
		expect(getOperatorScope(j.api)).toEqual(scope);
	});

	it('rejects a hand-written unsigned JSON cookie', () => {
		expect(getOperatorScope(jar(JSON.stringify(scope)).api)).toBeNull();
	});

	it('rejects a payload changed after signing', () => {
		const j = jar();
		setOperatorScope(j.api, scope);
		const [, sig] = j.value!.split('.');
		const forged = Buffer.from(
			JSON.stringify({ ...scope, id: '11111111-1111-4111-8111-111111111111' })
		).toString('base64url');
		expect(getOperatorScope(jar(`${forged}.${sig}`).api)).toBeNull();
	});

	it('refuses to sign a non-UUID id (path-injection guard)', () => {
		expect(() => setOperatorScope(jar().api, { ...scope, id: '../../admin' })).toThrow();
	});
});
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement.** In `scope.ts` keep the header comment and `OperatorScope`, and replace set/get with:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { config, isProd } from './config.ts';

const scopeSchema = z.object({
	id: z.string().uuid(),
	slug: z.string().min(1).max(100),
	display_name: z.string().max(200)
});

function sign(payload: string): string {
	return createHmac('sha256', config.SCOPE_COOKIE_SECRET).update(payload).digest('base64url');
}

export function setOperatorScope(cookies: Cookies, scope: OperatorScope): void {
	const payload = Buffer.from(JSON.stringify(scopeSchema.parse(scope))).toString('base64url');
	cookies.set(OP_TENANT_COOKIE, `${payload}.${sign(payload)}`, {
		path: '/',
		httpOnly: true,
		secure: isProd(),
		sameSite: 'strict',
		maxAge: 8 * 3600
	});
}

/**
 * httpOnly does not stop a user from writing their own cookie, so the
 * value is only trusted when its HMAC verifies. The id is UUID-checked
 * because it is sent as `X-Tenant-Id` and placed in upstream URL paths.
 */
export function getOperatorScope(cookies: Cookies): OperatorScope | null {
	const raw = cookies.get(OP_TENANT_COOKIE);
	if (!raw) return null;
	const dot = raw.lastIndexOf('.');
	if (dot <= 0) return null;
	const payload = raw.slice(0, dot);
	const given = Buffer.from(raw.slice(dot + 1));
	const expected = Buffer.from(sign(payload));
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
	try {
		const parsed = scopeSchema.safeParse(
			JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
		);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
```

In `src/routes/api/operator/scope/+server.ts`, wrap `setOperatorScope` so a non-UUID tenant id from Go returns `502 { error: 'tenant_lookup_failed' }` instead of throwing, Zod-parse the tenant lookup response instead of casting, and add `signal: AbortSignal.timeout(config.UPSTREAM_TIMEOUT_MS)` to its fetch.

- [ ] **Step 4: Run the tests** (4 pass), run the operator e2e spec: `CI=1 npx playwright test tests/e2e/operator-tenant-management.spec.ts --project=chromium --retries=0` (same pass/fail set as before this task).

- [ ] **Step 5: Gates and commit**

```bash
git commit -am "fix(security): HMAC-signed, UUID-validated operator scope cookie"
```

---

### Task 5: Proxy hardening

**Files:**

- Create: `src/lib/server/proxy.ts` (pure helpers)
- Test: `tests/unit/server/proxy.test.ts`
- Modify: `src/routes/api/[...path]/+server.ts`, `src/lib/server/go.ts`, `tests/e2e/mock-server/server.mjs` (record request headers), `tests/e2e/operator-tenant-management.spec.ts` (assert injected headers)

**Interfaces:**

- Consumes: `refreshSession` (Task 3), `getOperatorScope` (Task 4), `config.UPSTREAM_TIMEOUT_MS`.
- Produces: `buildUpstreamUrl(base, path, search): URL | null`, `isTokenEndpoint(path): boolean`, `scrubsTokens(method, path): boolean`, `stripTokenFields(body: unknown): unknown`, `pickResponseHeaders(upstream: Headers): Headers`, `upstreamSignal(request: Request, ms: number): AbortSignal`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/proxy.test.ts
import { describe, expect, it } from 'vitest';
import {
	buildUpstreamUrl,
	isTokenEndpoint,
	pickResponseHeaders,
	scrubsTokens,
	stripTokenFields
} from '#lib/server/proxy.ts';

const base = 'http://go.internal:8080';

describe('buildUpstreamUrl', () => {
	it('maps a v1 path and keeps the query string', () => {
		expect(buildUpstreamUrl(base, 'v1/leads/42', '?stage=new')?.href).toBe(
			'http://go.internal:8080/api/v1/leads/42?stage=new'
		);
	});

	// SvelteKit hands `params.path` over already decoded once.
	it.each([
		['dot-dot segment (from ..%2F)', 'v1/../../debug'],
		['leading dot-dot', '../admin'],
		['encoded dot-dot that survives one decode (from %252e%252e)', 'v1/%2e%2e/%2e%2e/debug'],
		['single dot', 'v1/./leads'],
		['backslash', 'v1/leads\\..\\admin'],
		['empty segment', 'v1//leads'],
		['not under v1', 'v2/leads'],
		['bare v1', 'v1'],
		['control character', 'v1/leads\n/x'],
		['malformed escape', 'v1/%E0%A4%A']
	])('rejects %s', (_label, path) => {
		expect(buildUpstreamUrl(base, path, '')).toBeNull();
	});

	it('never leaves /api/v1/ and never changes origin', () => {
		const url = buildUpstreamUrl(base, 'v1/a%2Fb/c', '')!;
		expect(url.origin).toBe(base);
		expect(url.pathname.startsWith('/api/v1/')).toBe(true);
	});
});

describe('token handling', () => {
	it('blocks the endpoints that return tokens', () => {
		expect(isTokenEndpoint('v1/auth/login')).toBe(true);
		expect(isTokenEndpoint('v1/auth/refresh')).toBe(true);
		expect(isTokenEndpoint('v1/auth/me/capabilities')).toBe(false);
	});

	it('scrubs token fields from the impersonation-start response only', () => {
		expect(scrubsTokens('POST', 'v1/platform/impersonation/sessions')).toBe(true);
		expect(scrubsTokens('GET', 'v1/platform/impersonation/sessions')).toBe(false);
		expect(
			stripTokenFields({
				session_id: 's1',
				access_token: 'jwt',
				refresh_token: 'r',
				expires_at: 'x'
			})
		).toEqual({
			session_id: 's1',
			expires_at: 'x'
		});
	});
});

describe('pickResponseHeaders', () => {
	it('forwards the allowlist, adds no-store, and drops everything else', () => {
		const out = pickResponseHeaders(
			new Headers({
				'content-type': 'application/json',
				'retry-after': '30',
				etag: '"abc"',
				'content-disposition': 'attachment; filename="x.csv"',
				'set-cookie': 'evil=1',
				server: 'go',
				'x-internal-trace': 't'
			})
		);
		expect(out.get('content-type')).toBe('application/json');
		expect(out.get('retry-after')).toBe('30');
		expect(out.get('etag')).toBe('"abc"');
		expect(out.get('content-disposition')).toContain('x.csv');
		expect(out.get('cache-control')).toBe('no-store');
		expect(out.get('set-cookie')).toBeNull();
		expect(out.get('server')).toBeNull();
		expect(out.get('x-internal-trace')).toBeNull();
	});
});
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement `proxy.ts`**

```ts
// src/lib/server/proxy.ts
/**
 * Pure helpers for the BFF proxy (`routes/api/[...path]/+server.ts`).
 * Everything security-relevant about the proxy is decided here so it can
 * be unit-tested without a server.
 */

const UPSTREAM_PREFIX = '/api/v1/';
const SEGMENT_FORBIDDEN = /[/\\?#\u0000-\u001f\u007f]/;

/**
 * Build the Go URL for a proxied request, or null when the path is not a
 * plain `v1/...` path.
 *
 * `path` is SvelteKit's rest param, already percent-decoded once. Every
 * segment is validated and then re-encoded, so a segment such as
 * `%2e%2e` (left over from a double-encoded `..`) is sent to Go as the
 * literal text `%252e%252e` rather than being read as `..` by the URL
 * parser. The final pathname and origin are asserted as a last line of
 * defence.
 */
export function buildUpstreamUrl(base: string, path: string, search: string): URL | null {
	const segments = path.split('/');
	if (segments.length < 2 || segments[0] !== 'v1') return null;

	for (const segment of segments) {
		if (segment === '' || segment === '.' || segment === '..') return null;
		if (SEGMENT_FORBIDDEN.test(segment)) return null;
		let decoded: string;
		try {
			decoded = decodeURIComponent(segment);
		} catch {
			return null;
		}
		if (decoded === '.' || decoded === '..') return null;
	}

	let origin: string;
	let url: URL;
	try {
		origin = new URL(base).origin;
		url = new URL(`/api/${segments.map(encodeURIComponent).join('/')}${search}`, origin);
	} catch {
		return null;
	}
	if (url.origin !== origin || !url.pathname.startsWith(UPSTREAM_PREFIX)) return null;
	return url;
}

/** Endpoints whose whole purpose is to return tokens. Reached only through /auth/* BFF routes. */
const TOKEN_ENDPOINTS = new Set(['v1/auth/login', 'v1/auth/refresh']);
export function isTokenEndpoint(path: string): boolean {
	return TOKEN_ENDPOINTS.has(path);
}

/** Responses that carry tokens next to data the browser does need. */
export function scrubsTokens(method: string, path: string): boolean {
	return method === 'POST' && path === 'v1/platform/impersonation/sessions';
}

const TOKEN_FIELDS = new Set(['access_token', 'refresh_token', 'token', 'id_token']);
export function stripTokenFields(body: unknown): unknown {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) return body;
	return Object.fromEntries(Object.entries(body).filter(([key]) => !TOKEN_FIELDS.has(key)));
}

const FORWARDED_RESPONSE_HEADERS = [
	'content-type',
	'content-disposition',
	'retry-after',
	'etag',
	'last-modified',
	'location'
];

/** Allowlist of upstream response headers. Authenticated responses are never cached. */
export function pickResponseHeaders(upstream: Headers): Headers {
	const out = new Headers();
	for (const name of FORWARDED_RESPONSE_HEADERS) {
		const value = upstream.get(name);
		if (value) out.set(name, value);
	}
	out.set('cache-control', 'no-store');
	return out;
}

/** Abort when the browser disconnects or the upstream takes too long. */
export function upstreamSignal(request: Request, ms: number): AbortSignal {
	return AbortSignal.any([request.signal, AbortSignal.timeout(ms)]);
}
```

- [ ] **Step 4: Run the unit tests** → all pass.

- [ ] **Step 5: Rewrite the route handler body** in `src/routes/api/[...path]/+server.ts` to use the helpers. Keep the header comment (update the responsibilities list) and the CSRF block. The rest of `proxy()` becomes:

```ts
if (isTokenEndpoint(path)) return jsonError(404, 'not_found', 'Not found');

const upstreamUrl = buildUpstreamUrl(config.GO_API_URL, path, new URL(request.url).search);
if (!upstreamUrl) return jsonError(400, 'invalid_path', 'Invalid API path');

const upstreamHeaders = new Headers({ accept: 'application/json' });
const access = cookies.get(ACCESS_COOKIE());
if (access) upstreamHeaders.set('authorization', `Bearer ${access}`);
const contentType = request.headers.get('content-type');
if (contentType) upstreamHeaders.set('content-type', contentType);

// Operator scope is trusted only from the signed cookie. Any
// X-Tenant-Id sent by the browser is ignored: the headers above are
// built from scratch.
const scope = getOperatorScope(cookies);
if (scope) upstreamHeaders.set('x-tenant-id', scope.id);

// Buffered once so the request can be replayed after a refresh.
const body = MUTATING.has(request.method)
	? (bufferedBody ?? (await request.arrayBuffer()))
	: undefined;

let upstream: Response;
try {
	upstream = await fetch(upstreamUrl, {
		method: request.method,
		headers: upstreamHeaders,
		body: body ?? null,
		signal: upstreamSignal(request, config.UPSTREAM_TIMEOUT_MS)
	});
} catch (err) {
	return err instanceof DOMException && err.name === 'TimeoutError'
		? jsonError(504, 'upstream_timeout', 'Go API did not respond in time')
		: jsonError(502, 'upstream_unavailable', 'Go API is unreachable');
}

if (upstream.status === 401 && attempt === 1) {
	await upstream.body?.cancel();
	if (await refreshSession(cookies)) return proxy(event, 2, body);
}

const headers = pickResponseHeaders(upstream.headers);
if (NULL_BODY_STATUSES.has(upstream.status)) {
	return new Response(null, { status: upstream.status, headers });
}
if (upstream.ok && scrubsTokens(request.method, path)) {
	const data: unknown = await upstream.json().catch(() => null);
	return Response.json(stripTokenFields(data), { status: upstream.status, headers });
}
// Streamed straight through: no buffering of large exports.
return new Response(upstream.body, { status: upstream.status, headers });
```

with `proxy(event: RequestEvent, attempt = 1, bufferedBody?: ArrayBuffer)`, a module-level `const NULL_BODY_STATUSES = new Set([204, 205, 304]);`, and one local helper:

```ts
function jsonError(status: number, error: string, message: string): Response {
	return Response.json({ error, message }, { status, headers: { 'cache-control': 'no-store' } });
}
```

Use `jsonError` for the CSRF response too (same body as today: `csrf_mismatch`, "CSRF token missing or invalid").

- [ ] **Step 6: Timeout for server-side Go calls.** In `src/lib/server/go.ts` `goFetch`, pass `signal: init.signal ?? AbortSignal.timeout(config.UPSTREAM_TIMEOUT_MS)`. In `src/routes/(app)/+layout.server.ts`, route the capabilities call through `goFetch(cookies, '/v1/auth/me/capabilities', { requireAuth: false })` instead of a raw `fetch` (one Go client for all server loads), and Zod-parse the result with the capabilities schema from `$features/auth` schemas (import the schema file directly; server code must not import the component-exporting barrel).

- [ ] **Step 7: Make the e2e header test real.** In `tests/e2e/mock-server/server.mjs`, record `headers: req.headers` on each logged call. In `tests/e2e/operator-tenant-management.spec.ts`, in the test titled "BFF auto-injects X-Tenant-Id", assert on the recorded `/api/v1/users` call: `x-tenant-id` equals the scoped tenant UUID and `authorization` starts with `Bearer `. Add one test: a browser `fetch('/api/v1/users', { headers: { 'X-Tenant-Id': '<other uuid>' } })` (via `page.evaluate`) reaches Go with the cookie's tenant id, not the spoofed one. Add one test: `page.request.get('/api/..%2F..%2Fdebug')` returns 400 or 404 and the mock recorded **no** call outside `/api/v1/`.

- [ ] **Step 8: Run** unit tests, `npm run build`, then `CI=1 npx playwright test tests/e2e/operator-tenant-management.spec.ts --project=chromium --retries=0`. Ports free afterwards.

- [ ] **Step 9: Gates and commit**

```bash
git add -A
git commit -m "fix(security): proxy path validation, token endpoint block + scrub, header allowlist, timeouts, streaming"
```

---

### Task 6: Security headers + CSP

**Files:**

- Create: `src/hooks.server.ts`
- Modify: `vite.config.ts` (`csp` option of `sveltekit({...})`), `src/app.html` (nonce on the inline theme script), `knip.config.ts` only if it flags the new hook
- Test: `tests/unit/server/security-headers.test.ts`, `tests/e2e/security-headers.spec.ts`

**Interfaces:**

- Produces: `securityHeaders(prod: boolean): Record<string, string>` exported from `src/lib/server/security-headers.ts`; `handle` in `hooks.server.ts`.

- [ ] **Step 1: Write the failing unit test**

```ts
// tests/unit/server/security-headers.test.ts
import { describe, expect, it } from 'vitest';
import { securityHeaders } from '#lib/server/security-headers.ts';

describe('securityHeaders', () => {
	it('always sets the baseline headers', () => {
		expect(securityHeaders(false)).toMatchObject({
			'x-content-type-options': 'nosniff',
			'x-frame-options': 'DENY',
			'referrer-policy': 'strict-origin-when-cross-origin',
			'permissions-policy': 'camera=(), microphone=(), geolocation=()'
		});
	});
	it('adds HSTS only in production', () => {
		expect(securityHeaders(false)['strict-transport-security']).toBeUndefined();
		expect(securityHeaders(true)['strict-transport-security']).toBe(
			'max-age=63072000; includeSubDomains'
		);
	});
});
```

- [ ] **Step 2: Implement**

```ts
// src/lib/server/security-headers.ts
/** Response headers set on every SSR / endpoint response. CSP is configured in vite.config.ts. */
export function securityHeaders(prod: boolean): Record<string, string> {
	return {
		'x-content-type-options': 'nosniff',
		'x-frame-options': 'DENY',
		'referrer-policy': 'strict-origin-when-cross-origin',
		'permissions-policy': 'camera=(), microphone=(), geolocation=()',
		...(prod ? { 'strict-transport-security': 'max-age=63072000; includeSubDomains' } : {})
	};
}
```

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit/hooks';
import { isProd } from '#lib/server/config.ts';
import { securityHeaders } from '#lib/server/security-headers.ts';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	for (const [name, value] of Object.entries(securityHeaders(isProd()))) {
		response.headers.set(name, value);
	}
	return response;
};
```

If `Handle` is not exported from `@sveltejs/kit/hooks` in 3.3, import it from where `node_modules/@sveltejs/kit/types/index.d.ts` declares it.

- [ ] **Step 3: Configure the CSP** in `vite.config.ts`, inside `sveltekit({ ... })`:

```ts
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					// Svelte transitions and inline style attributes need this.
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', 'blob:'],
					'font-src': ['self', 'data:'],
					'connect-src': ['self'],
					'worker-src': ['self'],
					'manifest-src': ['self'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'object-src': ['none']
				}
			},
```

In `src/app.html`, add `nonce="%sveltekit.nonce%"` to the inline `<script>` that primes the theme attributes (around lines 60-105).

- [ ] **Step 4: Write the e2e test**

```ts
// tests/e2e/security-headers.spec.ts
import { expect, test } from '@playwright/test';

test('signin responds with security headers and a CSP', async ({ page }) => {
	const violations: string[] = [];
	page.on('console', (msg) => {
		if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
	});
	const response = await page.goto('/signin');
	const headers = response!.headers();
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
	expect(headers['content-security-policy']).toContain("script-src 'self'");
	await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
	expect(violations).toEqual([]);
});
```

Add a second test that signs in (existing helper), visits `/dashboard`, `/leads` and `/settings/account/profile`, and asserts `violations` stays empty.

- [ ] **Step 5: Run** the unit test, `npm run build`, then the e2e spec. If a CSP violation appears, fix its source (for example an inline `<script>` or `on*=` attribute) rather than loosening `script-src`. Report any directive you had to widen, with the exact violation text.

- [ ] **Step 6: Gates and commit**

```bash
git add -A
git commit -m "feat(security): hooks.server security headers + strict CSP with nonce"
```

---

### Task 7: Server-side capability guards

**Files:**

- Create: `src/lib/server/guards.ts`
- Test: `tests/unit/server/guards.test.ts`
- Create: `+page.server.ts` (or extend the existing one) for each guarded route below
- Modify: the matching `+page.svelte` files (delete the client `$effect` + `goto` guard)
- Create: `scripts/arch/check-no-client-capability-guards.mjs`, register it in `scripts/arch/run-all.mjs`

**Interfaces:**

- Consumes: `hasCapability(caps, permission)` and `type Capabilities` from `src/lib/features/auth/capabilities.ts` (pure module, no Svelte imports).
- Produces: `requireCapability(caps: Capabilities | undefined, permission: string): void` (throws `redirect(303, '/dashboard')` when the capability is missing).

Guarded routes and today's client guard locations: `operator/persons/+page.svelte:8`, `operator/persons/[id]/+page.svelte:25`, `operator/tenants/+page.svelte:8`, `settings/roles/+page.svelte:8`, `settings/roles/new/+page.svelte:23`, `settings/roles/[id]/+page.svelte:60`, `settings/users/+page.svelte:10`, `settings/users/hierarchy/+page.svelte:22`, `settings/users/[id]/+page.svelte:29` (all under `src/routes/(app)/`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/guards.test.ts
import { describe, expect, it } from 'vitest';
import { requireCapability } from '#lib/server/guards.ts';

const caps = (permissions: string[], extra = {}) =>
	({ is_platform: false, is_super_user: false, permissions, ...extra }) as never;

function redirectOf(fn: () => void): { status: number; location: string } | null {
	try {
		fn();
		return null;
	} catch (e) {
		return e as { status: number; location: string };
	}
}

describe('requireCapability', () => {
	it('passes when the permission is held', () => {
		expect(
			redirectOf(() => requireCapability(caps(['identity.users.view']), 'identity.users.view'))
		).toBeNull();
	});
	it('passes for a super user', () => {
		expect(
			redirectOf(() =>
				requireCapability(caps([], { is_super_user: true }), 'identity.roles.create')
			)
		).toBeNull();
	});
	it('redirects to /dashboard when the permission is missing', () => {
		expect(redirectOf(() => requireCapability(caps([]), 'identity.users.view'))).toMatchObject({
			status: 303,
			location: '/dashboard'
		});
	});
	it('redirects when capabilities are missing entirely', () => {
		expect(redirectOf(() => requireCapability(undefined, 'identity.users.view'))).toMatchObject({
			status: 303
		});
	});
});
```

- [ ] **Step 2: Implement**

```ts
// src/lib/server/guards.ts
import { redirect } from '@sveltejs/kit';
import { hasCapability, type Capabilities } from '#lib/features/auth/capabilities.ts';

/**
 * Server-side route guard. Runs in a `+page.server.ts` / `+layout.server.ts`
 * load, so an unauthorised user never receives the page or its data.
 * Behaviour matches the old client guard: back to the dashboard.
 */
export function requireCapability(caps: Capabilities | undefined, permission: string): void {
	if (!hasCapability(caps, permission)) redirect(303, '/dashboard');
}
```

If the layering gates reject `lib/server` importing `features/auth/capabilities.ts`, add the narrowest rule exception that names exactly that pure file (with a comment), not a directory.

- [ ] **Step 3: Move each guard to the server.** For every route in the list: read the permission string its client `$effect` checks, then add to that route's `+page.server.ts` (create the file if absent):

```ts
import { requireCapability } from '#lib/server/guards.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { capabilities } = await parent();
	requireCapability(capabilities, '<the exact permission string from the old client guard>');
};
```

Where a `+page.server.ts` already exists with `actions` only, add the `load` export; where a `load` exists, add the two lines at its top. Then delete the client `$effect` + `goto` guard and any imports only it used. **One correction while moving:** `settings/roles/new` checks `identity.roles.manage`, which does not exist in `src/lib/features/roles/permissions-catalogue.ts`; use `identity.roles.create`.

- [ ] **Step 4: Guard the unguarded routes from `nav.ts`.** `src/lib/config/nav.ts` already attaches a permission to each nav item. For `/leads`, `/orders`, `/inventory`, `/permission-requests` and the `settings/tenant` layout: if the nav item (or its group) names a permission, add the same server guard with that exact string (for `settings/tenant` put it in `+layout.server.ts`). If a route has no permission in `nav.ts`, do not invent one; list it in the report.

- [ ] **Step 5: Add the arch gate** so client guards cannot return:

```js
// scripts/arch/check-no-client-capability-guards.mjs
// Fails when a route component redirects on a capability check inside $effect.
// Capability guards belong in +page.server.ts via requireCapability().
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const files = globSync('src/routes/**/*.svelte');
const offenders = [];
for (const file of files) {
	const src = readFileSync(file, 'utf8');
	const effects = src.match(/\$effect\(\s*\(\)\s*=>\s*\{[\s\S]*?\n\t\}\);/g) ?? [];
	if (effects.some((e) => /hasCapability|capabilities/.test(e) && /goto\(/.test(e)))
		offenders.push(file);
}
if (offenders.length) {
	console.error(
		`✗ check-no-client-capability-guards: ${offenders.length} file(s) guard on the client:\n  ${offenders.join('\n  ')}`
	);
	process.exit(1);
}
console.log(
	`✓ check-no-client-capability-guards: ${files.length} route component(s), no client-side capability redirects.`
);
```

Match the registration style and output format of the other scripts in `scripts/arch/` (read `run-all.mjs` and one existing gate first). Prove it fires: temporarily restore one client guard, run `npm run arch:check` (expect a failure naming the file), revert.

- [ ] **Step 6: Run** unit tests, `npm run build`, then the e2e specs that cover these routes: `CI=1 npx playwright test tests/e2e/tenant-roles-management.spec.ts tests/e2e/role-hierarchy.spec.ts tests/e2e/operator-tenant-management.spec.ts --project=chromium --retries=0`. The pass/fail set must not get worse than before this task; record it.

- [ ] **Step 7: Gates and commit**

```bash
git add -A
git commit -m "fix(security): capability guards run on the server (requireCapability) + arch gate"
```

---

### Task 8: P0 UI crash fixes

**Files:**

- Modify: `src/routes/+layout.svelte` (mount `Tooltip.Provider` once)
- Modify: `src/routes/(app)/orders/[id]/+page.svelte` (`{#key}` on the order id)
- Modify: `src/lib/features/orders/components/OrderActionButtons.svelte`, `CancelOrderDialog.svelte`, `DispatchDialog.svelte`, `MarkPackedDialog.svelte` and `src/lib/features/orders/queries.ts` (order id travels in mutation variables)
- Test: `tests/e2e/orders.spec.ts` (new case), `tests/e2e/tenant-roles-management.spec.ts` (role detail renders)

- [ ] **Step 1: Tooltip provider.** `PermissionTree.svelte` renders `Tooltip.Root` with no `Tooltip.Provider` above it; bits-ui v2 throws, so `/settings/roles/[id]` crashes. In `src/routes/+layout.svelte`, wrap the rendered children:

```svelte
<script lang="ts">
	import { Tooltip } from '$ui';
	// …existing imports and props
</script>

<Tooltip.Provider delayDuration={200}>
	{@render children()}
</Tooltip.Provider>
```

Check `src/lib/components/ui/tooltip/index.ts` exports `Provider`; if not, export bits-ui's `Tooltip.Provider` from it. In `PermissionTree.svelte:82`, give the icon-only `Tooltip.Trigger` an accessible name: `aria-label={`About ${entry.label}`}` (use the entry's visible label field).

- [ ] **Step 2: Write the failing e2e check** in `tests/e2e/tenant-roles-management.spec.ts`: open a role's detail page and assert the permission tree is visible and no page error fired:

```ts
test('role detail renders the permission tree without crashing', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	// sign in + open a role detail page using this spec's existing helpers
	await expect(page.getByRole('heading', { name: /permissions/i })).toBeVisible();
	expect(errors).toEqual([]);
});
```

Run it before Step 1's change to see it fail, and after to see it pass.

- [ ] **Step 3: Order actions can no longer hit the wrong order.** SvelteKit reuses the page component when only `[id]` changes, and the order components capture the id once with `untrack`. Two changes, both required:
  1. In `src/routes/(app)/orders/[id]/+page.svelte`, wrap the detail in `{#key data.id}` … `{/key}` (use whichever expression holds the route id there).
  2. In `src/lib/features/orders/queries.ts`, change each per-order mutation factory so the id is part of the variables, not a captured argument: `mutationFn: ({ id, ...body }: { id: string } & Body) => api(id, body)`, with cache updates keyed from `variables.id`. Update the four components to pass `id` at call time (`mutation.mutate({ id, … })`) and delete their `untrack` captures.

- [ ] **Step 4: Add the e2e regression test** to `tests/e2e/orders.spec.ts`: open order A, client-navigate to order B (via the list link, not a reload), trigger an action, and assert the mock received the action for **B's** id.

- [ ] **Step 5: Run** `npm run build`, then `CI=1 npx playwright test tests/e2e/orders.spec.ts tests/e2e/tenant-roles-management.spec.ts --project=chromium --retries=0`. Record the pass/fail set and compare with the baseline in `.superpowers/sdd/progress.md`.

- [ ] **Step 6: Gates and commit**

```bash
git add -A
git commit -m "fix(ui): mount Tooltip.Provider (role detail crash); order actions carry the order id"
```
