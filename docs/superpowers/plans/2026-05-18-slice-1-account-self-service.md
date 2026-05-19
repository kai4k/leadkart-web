# Slice 1 — Account self-service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the signed-in user's account-self-service surface — view & edit own profile (designation/department/status_message), see & revoke active sessions — wired to real backend endpoints. Lands the first new UI primitive (`Badge`) along the way.

**Architecture:** Gateway → service → view-model → component (per CLAUDE.md). Profile + sessions live under the existing `auth` feature (`lib/features/auth/`). New routes under `/settings/account/{profile,security,sessions}` with a layout providing the sub-nav. Mirrors the `/settings/tenant/*` layout-with-sub-nav pattern already in the codebase.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript 6, Zod for boundary validation, Tailwind 4, Vitest 4, Playwright + axe-core. No new deps.

**Spec reference:** [`docs/superpowers/specs/2026-05-18-identity-module-completion-design.md`](../specs/2026-05-18-identity-module-completion-design.md) §3 (non-goals), §4.1–4.8 (cross-cutting), §5.1 (this slice).

**Prerequisite knowledge** (read before starting if unfamiliar):

- `src/lib/features/tenant/stores/tenant.svelte.ts` — class-store pattern this slice mirrors
- `src/lib/features/tenant/api.ts` — gateway pattern this slice mirrors
- `src/lib/features/auth/api.ts` — current auth gateway; this slice extends it
- `src/lib/features/auth/types.ts` + `schemas.ts` — current shapes
- `src/routes/(app)/settings/tenant/+layout.svelte` — layout-with-sub-nav pattern this slice mirrors
- `src/lib/components/ui/card/` — folder + namespace-barrel convention (spec §4.4) — Badge follows the FLAT-singleton variant, not this compound variant

---

## File map

**Create:**

- `src/lib/features/auth/view-models.ts` — pure transforms (displayName, initials, lastSeenLabel, isCurrentSession)
- `src/lib/features/auth/stores/profile.svelte.ts` — ProfileStore class
- `src/lib/features/auth/stores/sessions.svelte.ts` — SessionsStore class
- `src/lib/features/auth/components/ProfileForm.svelte` — read-only name/email + editable designation/department/status_message
- `src/lib/features/auth/components/SessionsList.svelte` — rows with device-label + last-seen + current-Badge + revoke action
- `src/lib/components/ui/Badge.svelte` — flat singleton, variant prop dispatches state-pair tokens
- `src/routes/(app)/settings/account/+layout.svelte` — header + sub-nav (Profile · Security · Sessions)
- `src/routes/(app)/settings/account/profile/+page.svelte` — renders ProfileForm
- `src/routes/(app)/settings/account/sessions/+page.svelte` — renders SessionsList
- `tests/unit/auth/view-models.test.ts` — vitest unit
- `tests/unit/auth/schemas.test.ts` — vitest unit (zod round-trip)
- `tests/e2e/account-self-service.spec.ts` — playwright e2e

**Modify:**

- `src/lib/features/auth/schemas.ts` — add userDtoSchema, sessionDtoSchema, listSessionsResponseSchema, updateProfileRequestSchema
- `src/lib/features/auth/types.ts` — add inferred types from new schemas
- `src/lib/features/auth/api.ts` — add getMyProfile, updateMyProfile, listSessions, revokeSession, revokeOtherSessions
- `src/lib/features/auth/stores/session.svelte.ts` — expose `membershipId` accessor (if not already public) for gateway calls
- `src/lib/components/ui/index.ts` — re-export Badge
- `src/routes/(app)/settings/account/+page.ts` — change redirect target from `/security` to `/profile`

**No changes to** `src/lib/config/nav.ts` — sidebar keeps the single `Account & Security` link to `/settings/account/security`; the new sub-nav inside the account layout exposes Profile/Sessions siblings without bloating the sidebar.

---

## Backend contract (reference — DO NOT change)

```
GET    /api/v1/users/{membershipId}         → UserDto  (200)
PATCH  /api/v1/users/{membershipId}/profile → 204     body: { designation, department, status_message }

GET    /api/v1/auth/sessions                → { sessions: SessionDto[] }  (200)
DELETE /api/v1/auth/sessions/{familyId}     → 204
DELETE /api/v1/auth/sessions                → { revoked_count: number }   body: { except_current?, reason? }
```

`UserDto` shape (from `leadkart-go internal/identity/ports/dto.go`):

```ts
{
  membership_id: string;
  person_id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: 'active' | 'inactive' | 'pending';
  designation: string;       // editable
  department: string;        // editable
  status_message: string;    // editable
  joined_at: string;         // ISO 8601
  left_at: string | null;
  reports_to: string | null; // membership_id
  role_ids: string[];
}
```

`SessionDto`:

```ts
{
	family_id: string;
	tenant_id: string;
	device_label: string;
	created_at: string;
	last_used_at: string;
}
```

---

## Task list

### Task 1: Extend auth Zod schemas with profile + session shapes

**Files:**

- Modify: `src/lib/features/auth/schemas.ts`
- Test: `tests/unit/auth/schemas.test.ts` (create)

- [ ] **Step 1: Write failing test for schema round-trips**

Create `tests/unit/auth/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	userDtoSchema,
	sessionDtoSchema,
	listSessionsResponseSchema,
	updateProfileRequestSchema
} from '$lib/features/auth/schemas';

describe('userDtoSchema', () => {
	it('parses a well-formed UserDto', () => {
		const raw = {
			membership_id: 'mem_1',
			person_id: 'per_1',
			tenant_id: 'ten_1',
			email: 'a@b.com',
			first_name: 'Ada',
			last_name: 'Lovelace',
			status: 'active',
			designation: 'Engineer',
			department: 'Platform',
			status_message: '',
			joined_at: '2026-01-01T00:00:00Z',
			left_at: null,
			reports_to: null,
			role_ids: ['rol_1']
		};
		const parsed = userDtoSchema.parse(raw);
		expect(parsed.email).toBe('a@b.com');
		expect(parsed.role_ids).toEqual(['rol_1']);
	});

	it('rejects status outside enum', () => {
		expect(() =>
			userDtoSchema.parse({
				membership_id: 'm',
				person_id: 'p',
				tenant_id: 't',
				email: 'a@b.com',
				first_name: 'A',
				last_name: 'B',
				status: 'banned',
				designation: '',
				department: '',
				status_message: '',
				joined_at: '2026-01-01T00:00:00Z',
				left_at: null,
				reports_to: null,
				role_ids: []
			})
		).toThrow();
	});
});

describe('sessionDtoSchema', () => {
	it('parses a SessionDto', () => {
		const raw = {
			family_id: 'fam_1',
			tenant_id: 'ten_1',
			device_label: 'Chrome on macOS',
			created_at: '2026-05-10T12:00:00Z',
			last_used_at: '2026-05-18T09:00:00Z'
		};
		expect(sessionDtoSchema.parse(raw).family_id).toBe('fam_1');
	});
});

describe('listSessionsResponseSchema', () => {
	it('parses an array of sessions', () => {
		const raw = { sessions: [] };
		expect(listSessionsResponseSchema.parse(raw).sessions).toEqual([]);
	});
});

describe('updateProfileRequestSchema', () => {
	it('rejects extra fields (first_name not editable here)', () => {
		const raw = { designation: 'X', department: 'Y', status_message: '', first_name: 'illegal' };
		const parsed = updateProfileRequestSchema.parse(raw);
		expect('first_name' in parsed).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run tests/unit/auth/schemas.test.ts`
Expected: FAIL — schemas don't exist yet.

- [ ] **Step 3: Add the schemas**

Edit `src/lib/features/auth/schemas.ts`, append to the existing file:

```ts
export const userDtoSchema = z.object({
	membership_id: z.string(),
	person_id: z.string(),
	tenant_id: z.string(),
	email: z.string().email(),
	first_name: z.string(),
	last_name: z.string(),
	status: z.enum(['active', 'inactive', 'pending']),
	designation: z.string(),
	department: z.string(),
	status_message: z.string(),
	joined_at: z.string(),
	left_at: z.string().nullable(),
	reports_to: z.string().nullable(),
	role_ids: z.array(z.string())
});

export const sessionDtoSchema = z.object({
	family_id: z.string(),
	tenant_id: z.string(),
	device_label: z.string(),
	created_at: z.string(),
	last_used_at: z.string()
});

export const listSessionsResponseSchema = z.object({
	sessions: z.array(sessionDtoSchema)
});

export const updateProfileRequestSchema = z
	.object({
		designation: z.string().max(120),
		department: z.string().max(120),
		status_message: z.string().max(280)
	})
	.strict();
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run tests/unit/auth/schemas.test.ts`
Expected: PASS — all four describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/features/auth/schemas.ts tests/unit/auth/schemas.test.ts
git commit -m "feat(auth): add user + session Zod schemas

UserDto / SessionDto / ListSessionsResponse / UpdateProfileRequest
schemas with vitest round-trip coverage. Strict() on UpdateProfile
locks the gateway to the three editable fields (designation,
department, status_message) — server-side patch ignores extras
anyway, but the strict schema catches frontend mistakes at the
gateway boundary."
```

---

### Task 2: Add inferred types

**Files:**

- Modify: `src/lib/features/auth/types.ts`

- [ ] **Step 1: Append inferred types**

Edit `src/lib/features/auth/types.ts`, append:

```ts
import type {
	userDtoSchema,
	sessionDtoSchema,
	listSessionsResponseSchema,
	updateProfileRequestSchema
} from './schemas';

export type UserDto = z.infer<typeof userDtoSchema>;
export type SessionDto = z.infer<typeof sessionDtoSchema>;
export type ListSessionsResponse = z.infer<typeof listSessionsResponseSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
```

Note: if the file doesn't already `import { z } from 'zod'`, add that at the top.

- [ ] **Step 2: Verify the project still type-checks**

Run: `npm run check`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/features/auth/types.ts
git commit -m "feat(auth): infer types from new profile + session schemas"
```

---

### Task 3: Add gateway functions

**Files:**

- Modify: `src/lib/features/auth/api.ts`

- [ ] **Step 1: Add the five new gateway functions**

Append to `src/lib/features/auth/api.ts` (after `changePassword`):

```ts
/**
 * Authenticated. Server scopes to the caller's own membership when
 * `membershipId` matches the JWT's `membership_id` claim. Backend
 * returns 403 if a non-admin tries to read another membership.
 */
export async function getMyProfile(membershipId: string): Promise<UserDto> {
	const raw = await api.get<unknown>(`/v1/users/${membershipId}`);
	return userDtoSchema.parse(raw);
}

/**
 * PATCH the caller's own designation / department / status_message.
 * Server returns 204; no body to parse.
 */
export async function updateMyProfile(
	membershipId: string,
	patch: UpdateProfileRequest
): Promise<void> {
	await api.patch<void>(`/v1/users/${membershipId}/profile`, patch);
}

/**
 * List active session families for the caller.
 */
export async function listSessions(): Promise<SessionDto[]> {
	const raw = await api.get<unknown>('/v1/auth/sessions');
	return listSessionsResponseSchema.parse(raw).sessions;
}

/**
 * Revoke a single session family by ID. 204 on success.
 */
export async function revokeSession(familyId: string): Promise<void> {
	await api.delete<void>(`/v1/auth/sessions/${familyId}`);
}

/**
 * Revoke all OTHER sessions (keeps the caller's current session
 * alive — Auth0 / Okta canon for "sign me out of other devices").
 */
export async function revokeOtherSessions(reason?: string): Promise<{ revoked_count: number }> {
	const body: { except_current: true; reason?: string } = { except_current: true };
	if (reason) body.reason = reason;
	const raw = await api.delete<unknown>('/v1/auth/sessions', body);
	return z.object({ revoked_count: z.number().int().nonnegative() }).parse(raw);
}
```

Update the top-of-file imports to include the new schemas and types:

```ts
import {
	loginResponseSchema,
	refreshResponseSchema,
	userDtoSchema,
	sessionDtoSchema,
	listSessionsResponseSchema
} from './schemas';
import type {
	LoginRequest,
	LoginResponse,
	RefreshRequest,
	RefreshResponse,
	UserDto,
	SessionDto,
	UpdateProfileRequest
} from './types';
import { z } from 'zod';
```

Also update the docstring at the top of the file: the surface is no longer "intentionally minimal — only authenticated-user flows (login, silent refresh, logout, change-password)" — add a sentence noting the v0.2 expansion to profile + sessions, keeping the existing bans (signup, forgot-password, email-change) intact.

- [ ] **Step 2: Verify `api.delete` accepts a body**

Open `src/lib/api/client.ts`. Confirm the `delete` method signature accepts an optional body parameter. If not, this slice extends it:

```ts
delete<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>
```

If you have to extend `client.ts`, do it here in a separate commit before the gateway commit.

- [ ] **Step 3: Run type-check**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/features/auth/api.ts src/lib/api/client.ts
git commit -m "feat(auth): expose profile + sessions gateway calls

Adds getMyProfile / updateMyProfile / listSessions / revokeSession /
revokeOtherSessions. Schema-parses every response at the gateway
boundary per the established pattern. revokeOtherSessions defaults
except_current=true (Auth0 canon: 'sign me out of other devices'
preserves the active session)."
```

---

### Task 4: Build view-models

**Files:**

- Create: `src/lib/features/auth/view-models.ts`
- Test: `tests/unit/auth/view-models.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/auth/view-models.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	displayName,
	initials,
	lastSeenLabel,
	isCurrentSession
} from '$lib/features/auth/view-models';
import type { UserDto, SessionDto } from '$lib/features/auth/types';

const baseUser: UserDto = {
	membership_id: 'mem_1',
	person_id: 'per_1',
	tenant_id: 'ten_1',
	email: 'ada@example.com',
	first_name: 'Ada',
	last_name: 'Lovelace',
	status: 'active',
	designation: 'Engineer',
	department: 'Platform',
	status_message: '',
	joined_at: '2026-01-01T00:00:00Z',
	left_at: null,
	reports_to: null,
	role_ids: []
};

describe('displayName', () => {
	it('returns "First Last" when both present', () => {
		expect(displayName(baseUser)).toBe('Ada Lovelace');
	});
	it('falls back to email local-part when both names blank', () => {
		expect(displayName({ ...baseUser, first_name: '', last_name: '' })).toBe('ada');
	});
	it('uses just first name when last is blank', () => {
		expect(displayName({ ...baseUser, last_name: '' })).toBe('Ada');
	});
});

describe('initials', () => {
	it('returns two-letter monogram from first + last', () => {
		expect(initials(baseUser)).toBe('AL');
	});
	it('falls back to email[0] when no name', () => {
		expect(initials({ ...baseUser, first_name: '', last_name: '' })).toBe('A');
	});
});

describe('lastSeenLabel', () => {
	it('returns "just now" for timestamps under a minute', () => {
		const ts = new Date(Date.now() - 30_000).toISOString();
		expect(lastSeenLabel(ts)).toBe('just now');
	});
	it('returns "N minutes ago" for under an hour', () => {
		const ts = new Date(Date.now() - 5 * 60_000).toISOString();
		expect(lastSeenLabel(ts)).toBe('5 minutes ago');
	});
	it('returns "N hours ago" for under a day', () => {
		const ts = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
		expect(lastSeenLabel(ts)).toBe('3 hours ago');
	});
	it('returns absolute date for older timestamps', () => {
		const ts = new Date('2025-12-01T10:00:00Z').toISOString();
		expect(lastSeenLabel(ts)).toMatch(/Dec/);
	});
});

describe('isCurrentSession', () => {
	const sess: SessionDto = {
		family_id: 'fam_active',
		tenant_id: 'ten_1',
		device_label: 'Chrome on macOS',
		created_at: '2026-05-10T00:00:00Z',
		last_used_at: '2026-05-18T00:00:00Z'
	};
	it('returns true when family_id matches the active token family', () => {
		expect(isCurrentSession(sess, 'fam_active')).toBe(true);
	});
	it('returns false otherwise', () => {
		expect(isCurrentSession(sess, 'fam_other')).toBe(false);
	});
	it('returns false when no active family known', () => {
		expect(isCurrentSession(sess, null)).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx vitest run tests/unit/auth/view-models.test.ts`
Expected: FAIL — view-models module doesn't exist.

- [ ] **Step 3: Implement view-models**

Create `src/lib/features/auth/view-models.ts`:

```ts
/**
 * Auth feature view-models — pure transforms from UserDto / SessionDto
 * to render-ready shapes. No async, no side effects, no DOM access.
 * Per CLAUDE.md gateway → service → VM → component layering.
 */
import type { UserDto, SessionDto } from './types';

/**
 * Human display name for a user. Falls back to the email local-part
 * when both first + last are blank (rare but possible during the
 * pre-profile-fill window).
 */
export function displayName(user: UserDto): string {
	const first = user.first_name.trim();
	const last = user.last_name.trim();
	if (first && last) return `${first} ${last}`;
	if (first) return first;
	if (last) return last;
	return user.email.split('@')[0] ?? user.email;
}

/**
 * Two-letter monogram for Avatar. Uppercased.
 */
export function initials(user: UserDto): string {
	const first = user.first_name.trim();
	const last = user.last_name.trim();
	const f = first[0];
	const l = last[0];
	if (f && l) return `${f}${l}`.toUpperCase();
	if (f) return f.toUpperCase();
	if (l) return l.toUpperCase();
	const e = user.email[0];
	return e ? e.toUpperCase() : '?';
}

/**
 * Relative time label: "just now" / "N minutes ago" / "N hours ago"
 * within the first day, absolute date afterwards. Used by SessionsList.
 */
export function lastSeenLabel(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return iso;
	const diffMs = Date.now() - then;
	const diffMin = Math.floor(diffMs / 60_000);
	if (diffMin < 1) return 'just now';
	if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
	return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Does this session represent the caller's CURRENT login? The session
 * store exposes the active refresh-token family ID; if it matches the
 * session's family_id, this row is the "you are here" entry.
 */
export function isCurrentSession(session: SessionDto, activeFamilyId: string | null): boolean {
	if (!activeFamilyId) return false;
	return session.family_id === activeFamilyId;
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx vitest run tests/unit/auth/view-models.test.ts`
Expected: PASS — all four describes green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/features/auth/view-models.ts tests/unit/auth/view-models.test.ts
git commit -m "feat(auth): add view-models for profile + sessions display

Pure transforms — displayName, initials, lastSeenLabel,
isCurrentSession — covered by vitest. No async, no side effects
per CLAUDE.md VM layer rules."
```

---

### Task 5: Build ProfileStore

**Files:**

- Create: `src/lib/features/auth/stores/profile.svelte.ts`

- [ ] **Step 1: Implement the class store**

```ts
/**
 * ProfileStore — the caller's OWN profile state. Mirrors the shape
 * of lib/features/tenant/stores/tenant.svelte.ts: class with $state
 * fields, status enum, idempotent load(), mutate() that re-loads on
 * 204.
 *
 * Caller's membership ID comes from the session store (set at login).
 * If session.principal is null this store stays in 'idle' — the
 * (app) auth guard prevents that from happening in practice.
 */
import { getMyProfile, updateMyProfile } from '$features/auth/api';
import { session } from '$features/auth/stores/session.svelte';
import type { UserDto, UpdateProfileRequest } from '$features/auth/types';

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

export class ProfileStore {
	current = $state<UserDto | null>(null);
	status = $state<ProfileStatus>('idle');
	error = $state<string | null>(null);

	async load(): Promise<void> {
		const membershipId = session.principal?.membershipId;
		if (!membershipId) {
			this.status = 'error';
			this.error = 'No active session';
			return;
		}
		this.status = 'loading';
		this.error = null;
		try {
			this.current = await getMyProfile(membershipId);
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load profile';
		}
	}

	async update(patch: UpdateProfileRequest): Promise<void> {
		const membershipId = session.principal?.membershipId;
		if (!membershipId) throw new Error('No active session');
		this.status = 'saving';
		this.error = null;
		try {
			await updateMyProfile(membershipId, patch);
			// Optimistic merge; the next load() round-trips.
			if (this.current) {
				this.current = { ...this.current, ...patch };
			}
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to save profile';
			throw e;
		}
	}

	reset(): void {
		this.current = null;
		this.status = 'idle';
		this.error = null;
	}
}

export const profile = new ProfileStore();
```

- [ ] **Step 2: Verify `session.principal.membershipId` is exposed**

Open `src/lib/features/auth/stores/session.svelte.ts`. Confirm `principal.membershipId` (or equivalent) is part of the public shape. If it's named `membership_id` (snake-case), use that here instead. Fix imports / property names accordingly so this file compiles.

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/features/auth/stores/profile.svelte.ts
git commit -m "feat(auth): ProfileStore class for own-profile state

Mirrors tenant.svelte.ts shape. load() fetches via gateway,
update() patches optimistically. status enum drives UI states.
Singleton instance exported."
```

---

### Task 6: Build SessionsStore

**Files:**

- Create: `src/lib/features/auth/stores/sessions.svelte.ts`

- [ ] **Step 1: Implement**

```ts
/**
 * SessionsStore — the caller's active refresh-token families.
 * Mirrors ProfileStore's shape. Exposes the current family ID
 * (read from the session store) so SessionsList can mark the
 * "you are here" row.
 */
import {
	listSessions,
	revokeSession as revokeSessionApi,
	revokeOtherSessions as revokeOtherSessionsApi
} from '$features/auth/api';
import { session } from '$features/auth/stores/session.svelte';
import type { SessionDto } from '$features/auth/types';

export type SessionsStatus = 'idle' | 'loading' | 'ready' | 'mutating' | 'error';

export class SessionsStore {
	list = $state<SessionDto[]>([]);
	status = $state<SessionsStatus>('idle');
	error = $state<string | null>(null);

	get activeFamilyId(): string | null {
		return session.activeFamilyId ?? null;
	}

	async load(): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			this.list = await listSessions();
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load sessions';
		}
	}

	async revoke(familyId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await revokeSessionApi(familyId);
			this.list = this.list.filter((s) => s.family_id !== familyId);
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to revoke session';
			throw e;
		}
	}

	async revokeOthers(): Promise<number> {
		this.status = 'mutating';
		try {
			const { revoked_count } = await revokeOtherSessionsApi('user_revoked_others');
			// Drop everything except the current family; the server has too.
			const current = this.activeFamilyId;
			this.list = current ? this.list.filter((s) => s.family_id === current) : [];
			this.status = 'ready';
			return revoked_count;
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to revoke other sessions';
			throw e;
		}
	}

	reset(): void {
		this.list = [];
		this.status = 'idle';
		this.error = null;
	}
}

export const sessions = new SessionsStore();
```

- [ ] **Step 2: Verify `session.activeFamilyId` is exposed**

Open `src/lib/features/auth/stores/session.svelte.ts`. The store SHOULD know which refresh-token family is currently active (it's encoded in the refresh token at login). If it's not exposed via a getter, add one:

```ts
get activeFamilyId(): string | null {
	// Parse the refresh token JWT and return the `fam` claim, or null.
	if (!this.refreshToken) return null;
	try {
		const payload = JSON.parse(atob(this.refreshToken.split('.')[1]));
		return typeof payload.fam === 'string' ? payload.fam : null;
	} catch {
		return null;
	}
}
```

(If the refresh token isn't a JWT or doesn't carry `fam`, document the behaviour in the comment and return null — `isCurrentSession` then always returns false, which gracefully degrades the UI.)

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/features/auth/stores/sessions.svelte.ts src/lib/features/auth/stores/session.svelte.ts
git commit -m "feat(auth): SessionsStore + expose activeFamilyId

Lists / revokes session families. activeFamilyId surface on the
session store lets the list mark the 'you are here' row."
```

---

### Task 7: Build the Badge primitive

**Files:**

- Create: `src/lib/components/ui/Badge.svelte`
- Modify: `src/lib/components/ui/index.ts`
- Test: visual smoke in the styleguide route (optional; e2e covers the real usage)

- [ ] **Step 1: Write the component**

Per spec §4.5, Badge is a **flat singleton** (no compound parts). Variant prop dispatches to our state-pair tokens; sub-variant prop chooses solid / soft / outline.

```svelte
<!-- src/lib/components/ui/Badge.svelte -->
<script lang="ts" module>
	export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
	export type BadgeStyle = 'solid' | 'soft' | 'outline';
	export type BadgeSize = 'sm' | 'md';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		variant?: BadgeVariant;
		style?: BadgeStyle;
		size?: BadgeSize;
		class?: string;
		children: Snippet;
	};

	let {
		variant = 'neutral',
		style: badgeStyle = 'soft',
		size = 'md',
		class: className = '',
		children
	}: Props = $props();

	/**
	 * Token map — every visual decision routes through a CSS variable
	 * pair (`--color-{role}-{50,900}`) defined in tokens.css. NEVER
	 * inline hex / RGB / oklch literals here; if a new role needs a
	 * pair, add it in tokens.css first.
	 */
	const stylesByVariant: Record<BadgeVariant, Record<BadgeStyle, string>> = {
		neutral: {
			solid: 'bg-[var(--color-fg)] text-[var(--color-bg-elevated)]',
			soft: 'bg-[var(--color-bg-muted)] text-[var(--color-fg)]',
			outline: 'border border-[var(--color-border)] text-[var(--color-fg)]'
		},
		success: {
			solid: 'bg-[var(--color-success-500)] text-white',
			soft: 'bg-[var(--color-success-50)] text-[var(--color-success-900)]',
			outline: 'border border-[var(--color-success-500)] text-[var(--color-success-900)]'
		},
		warning: {
			solid: 'bg-[var(--color-warning-500)] text-white',
			soft: 'bg-[var(--color-warning-50)] text-[var(--color-warning-900)]',
			outline: 'border border-[var(--color-warning-500)] text-[var(--color-warning-900)]'
		},
		danger: {
			solid: 'bg-[var(--color-danger-500)] text-white',
			soft: 'bg-[var(--color-danger-50)] text-[var(--color-danger-900)]',
			outline: 'border border-[var(--color-danger-500)] text-[var(--color-danger-900)]'
		},
		info: {
			solid: 'bg-[var(--color-info-500)] text-white',
			soft: 'bg-[var(--color-info-50)] text-[var(--color-info-900)]',
			outline: 'border border-[var(--color-info-500)] text-[var(--color-info-900)]'
		},
		brand: {
			solid: 'bg-[var(--color-primary)] text-white',
			soft: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
			outline: 'border border-[var(--color-primary)] text-[var(--color-primary)]'
		}
	};

	const sizes: Record<BadgeSize, string> = {
		sm: 'px-1.5 py-0.5 text-[0.6875rem]',
		md: 'px-2 py-0.5 text-xs'
	};
</script>

<span
	class={cn(
		'label-small inline-flex items-center rounded-full leading-tight',
		stylesByVariant[variant][badgeStyle],
		sizes[size],
		className
	)}
>
	{@render children()}
</span>
```

- [ ] **Step 2: Re-export from the UI barrel**

Edit `src/lib/components/ui/index.ts`, add the line:

```ts
export { default as Badge } from './Badge.svelte';
```

Place it alphabetically with the other flat exports.

- [ ] **Step 3: Confirm all referenced tokens exist**

The component references these token pairs:

- `--color-success-50`, `--color-success-500`, `--color-success-900`
- `--color-warning-50`, `--color-warning-500`, `--color-warning-900`
- `--color-danger-50`, `--color-danger-500`, `--color-danger-900`
- `--color-info-50`, `--color-info-500`, `--color-info-900`
- `--color-fg`, `--color-bg-elevated`, `--color-bg-muted`, `--color-border`
- `--color-primary`, `--color-primary-soft`

Grep `src/styles/tokens.css` for each. If any are missing, add them in `tokens.css` before this commit. (Tenant-settings layout already uses `--color-success-50` etc. via inline class strings — if the layout renders successfully on `/settings/tenant`, the tokens exist.)

- [ ] **Step 4: Type-check + build**

Run: `npm run check && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ui/Badge.svelte src/lib/components/ui/index.ts
git commit -m "feat(ui): Badge primitive — variant × style × size

First new primitive from the slice-1 plan. Singleton (flat file
under ui/) per the shadcn-svelte folder convention captured in
the spec §4.4. variant (neutral/success/warning/danger/info/brand)
× style (solid/soft/outline) × size (sm/md). Every visual maps to
a token; no inline hex/oklch."
```

---

### Task 8: Build ProfileForm

**Files:**

- Create: `src/lib/features/auth/components/ProfileForm.svelte`

- [ ] **Step 1: Implement**

```svelte
<!-- src/lib/features/auth/components/ProfileForm.svelte -->
<script lang="ts">
	import { TextField } from '$lib/components/form';
	import { Alert, Button, Spinner } from '$ui';
	import { profile } from '$features/auth/stores/profile.svelte';
	import type { UpdateProfileRequest } from '$features/auth/types';
	import { displayName } from '$features/auth/view-models';

	/**
	 * ProfileForm — read-only name + email block at the top (admin-
	 * controlled fields), editable designation / department /
	 * status_message below. Save calls profile.update().
	 *
	 * Loading state is the responsibility of the parent route —
	 * this component renders only when profile.current is non-null.
	 */

	let designation = $state('');
	let department = $state('');
	let statusMessage = $state('');
	let saveError = $state<string | null>(null);
	let saved = $state(false);

	$effect(() => {
		if (profile.current) {
			designation = profile.current.designation;
			department = profile.current.department;
			statusMessage = profile.current.status_message;
		}
	});

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		saved = false;
		saveError = null;
		const patch: UpdateProfileRequest = {
			designation: designation.trim(),
			department: department.trim(),
			status_message: statusMessage.trim()
		};
		try {
			await profile.update(patch);
			saved = true;
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to save changes';
		}
	}

	const isSaving = $derived(profile.status === 'saving');
	const dirty = $derived(
		profile.current !== null &&
			(designation.trim() !== profile.current.designation ||
				department.trim() !== profile.current.department ||
				statusMessage.trim() !== profile.current.status_message)
	);
</script>

{#if profile.current}
	<form class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
		<!-- Read-only identity block -->
		<section class="stack stack-tight">
			<h2 class="h5">{displayName(profile.current)}</h2>
			<dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
				<div>
					<dt class="caption text-[var(--color-fg-muted)]">Email</dt>
					<dd class="body-base text-[var(--color-fg)]">{profile.current.email}</dd>
				</div>
				<div>
					<dt class="caption text-[var(--color-fg-muted)]">Status</dt>
					<dd class="body-base text-[var(--color-fg)] capitalize">{profile.current.status}</dd>
				</div>
			</dl>
			<p class="caption text-[var(--color-fg-subtle)]">
				Name + email are managed by your tenant administrator. To change them, ask your admin.
			</p>
		</section>

		<!-- Editable block -->
		<section class="stack stack-tight">
			<h3 class="h6">Workplace</h3>
			<TextField
				label="Designation"
				name="designation"
				bind:value={designation}
				placeholder="e.g. Sales Executive"
				maxlength={120}
			/>
			<TextField
				label="Department"
				name="department"
				bind:value={department}
				placeholder="e.g. Sales"
				maxlength={120}
			/>
			<TextField
				label="Status message"
				name="status_message"
				bind:value={statusMessage}
				placeholder="Optional — shown to teammates"
				maxlength={280}
			/>
		</section>

		{#if saveError}
			<Alert variant="danger">{saveError}</Alert>
		{:else if saved}
			<Alert variant="success">Profile updated.</Alert>
		{/if}

		<div class="cluster">
			<Button type="submit" disabled={!dirty || isSaving}>
				{#if isSaving}<Spinner size="sm" /> Saving…{:else}Save changes{/if}
			</Button>
		</div>
	</form>
{/if}
```

- [ ] **Step 2: Verify imports + run check**

`$lib/components/form` should already export `TextField`. `$ui` already exports `Alert`, `Button`, `Spinner` (Badge just added). Profile + view-models already imported. Run:

```
npm run check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/features/auth/components/ProfileForm.svelte
git commit -m "feat(auth): ProfileForm — own profile editor

Read-only identity block (name + email + status) + editable
workplace block (designation, department, status_message). Save
goes through ProfileStore.update(). Dirty + saving states drive
the submit button. Inline success/error feedback via Alert."
```

---

### Task 9: Build SessionsList

**Files:**

- Create: `src/lib/features/auth/components/SessionsList.svelte`

- [ ] **Step 1: Implement**

```svelte
<!-- src/lib/features/auth/components/SessionsList.svelte -->
<script lang="ts">
	import { Alert, Badge, Button, Card, Spinner } from '$ui';
	import { Trash2, LogOut, Icon } from '$icons';
	import { sessions } from '$features/auth/stores/sessions.svelte';
	import { isCurrentSession, lastSeenLabel } from '$features/auth/view-models';

	/**
	 * SessionsList — one Card row per session family.
	 * Current session is badged + cannot be revoked from this list
	 * (revoke-all-others does the equivalent for the user). Server
	 * also rejects deleting the active family at the gateway.
	 */

	let revokeError = $state<string | null>(null);
	let revokeAllError = $state<string | null>(null);
	let revokeAllPending = $state(false);

	async function onRevoke(familyId: string) {
		revokeError = null;
		try {
			await sessions.revoke(familyId);
		} catch (err) {
			revokeError = err instanceof Error ? err.message : 'Failed to revoke session';
		}
	}

	async function onRevokeOthers() {
		revokeAllError = null;
		revokeAllPending = true;
		try {
			const count = await sessions.revokeOthers();
			if (count === 0) revokeAllError = 'No other sessions to revoke.';
		} catch (err) {
			revokeAllError = err instanceof Error ? err.message : 'Failed to revoke other sessions';
		} finally {
			revokeAllPending = false;
		}
	}
</script>

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h2 class="h5">Active sessions</h2>
			<p class="caption text-[var(--color-fg-muted)]">
				Each row is a device or browser signed in to your account.
			</p>
		</div>
		<Button
			variant="ghost"
			onclick={onRevokeOthers}
			disabled={revokeAllPending || sessions.list.length <= 1}
		>
			{#if revokeAllPending}<Spinner size="sm" /> Revoking…{:else}
				<Icon icon={LogOut} size="sm" /> Sign out other devices
			{/if}
		</Button>
	</header>

	{#if revokeAllError}
		<Alert variant="warning">{revokeAllError}</Alert>
	{/if}
	{#if revokeError}
		<Alert variant="danger">{revokeError}</Alert>
	{/if}

	{#if sessions.list.length === 0}
		<Card.Root>
			<Card.Content class="text-center">
				<p class="body-base text-[var(--color-fg-muted)]">No active sessions.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<ul class="stack stack-tight" aria-label="Active sessions">
			{#each sessions.list as sess (sess.family_id)}
				{@const current = isCurrentSession(sess, sessions.activeFamilyId)}
				<li>
					<Card.Root>
						<Card.Content class="flex items-center justify-between gap-4">
							<div class="stack stack-tight min-w-0">
								<div class="cluster">
									<p class="body-base truncate font-medium text-[var(--color-fg)]">
										{sess.device_label || 'Unknown device'}
									</p>
									{#if current}
										<Badge variant="success" style="soft" size="sm">This device</Badge>
									{/if}
								</div>
								<p class="caption text-[var(--color-fg-muted)]">
									Last active {lastSeenLabel(sess.last_used_at)} · Started
									{lastSeenLabel(sess.created_at)}
								</p>
							</div>
							{#if !current}
								<Button
									variant="ghost"
									size="sm"
									aria-label="Revoke session"
									onclick={() => onRevoke(sess.family_id)}
								>
									<Icon icon={Trash2} size="sm" /> Revoke
								</Button>
							{/if}
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>
	{/if}
</div>
```

- [ ] **Step 2: Make sure the `Icon` registry exports `Trash2` and `LogOut`**

Open `src/lib/icons/index.ts`. If `Trash2` and `LogOut` aren't re-exported from lucide-svelte, add them:

```ts
export { Trash2, LogOut } from 'lucide-svelte';
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/features/auth/components/SessionsList.svelte src/lib/icons/index.ts
git commit -m "feat(auth): SessionsList — active sessions + revoke

Card rows per session family. Current session gets a 'This device'
Badge and no revoke button (server rejects it anyway). 'Sign out
other devices' button calls revokeOtherSessions. Empty + error
states surface via Card + Alert."
```

---

### Task 10: Account section layout with sub-nav

**Files:**

- Create: `src/routes/(app)/settings/account/+layout.svelte`
- Modify: `src/routes/(app)/settings/account/+page.ts`

- [ ] **Step 1: Build the layout**

```svelte
<!-- src/routes/(app)/settings/account/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { Alert, Spinner } from '$ui';
	import { profile } from '$features/auth/stores/profile.svelte';
	import { sessions } from '$features/auth/stores/sessions.svelte';
	import { displayName } from '$features/auth/view-models';
	import { cn } from '$lib/utils/cn';

	/**
	 * Account Settings layout — owns the shared chrome (header + sub-
	 * route nav) for /settings/account/* sub-pages. Mirrors the
	 * /settings/tenant/* pattern.
	 *
	 * Load lifecycle: profile.load() + sessions.load() are called
	 * once on this layout's first $effect run (idle-guarded). Layout
	 * persists across tab navigation, so subsequent clicks reuse the
	 * loaded snapshot.
	 */

	let { children } = $props();

	$effect(() => {
		if (profile.status === 'idle') {
			profile.load().catch(() => {
				/* status moves to 'error'; UI handles */
			});
		}
		if (sessions.status === 'idle') {
			sessions.load().catch(() => {});
		}
	});

	const tabs: ReadonlyArray<{ href: string; label: string }> = [
		{ href: '/settings/account/profile', label: 'Profile' },
		{ href: '/settings/account/security', label: 'Security' },
		{ href: '/settings/account/sessions', label: 'Sessions' }
	];

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<svelte:head>
	<title>Account · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		{#if profile.current}
			<h1 class="h1">{displayName(profile.current)}</h1>
			<p class="caption text-[var(--color-fg-muted)]">
				{profile.current.email}
			</p>
		{:else}
			<h1 class="h1">Account</h1>
		{/if}
	</header>

	<nav class="cluster cluster-tight" aria-label="Account settings sections">
		{#each tabs as tab (tab.href)}
			{@const active = isActive(tab.href)}
			<a
				href={tab.href}
				aria-current={active ? 'page' : undefined}
				class={cn(
					'label inline-flex items-center rounded-md px-3 py-1.5 transition-colors',
					active
						? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
						: 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-fg)]'
				)}
			>
				{tab.label}
			</a>
		{/each}
	</nav>

	{#if profile.status === 'loading'}
		<div class="cluster"><Spinner /> Loading account…</div>
	{:else if profile.status === 'error' && profile.error}
		<Alert variant="danger">{profile.error}</Alert>
	{:else}
		{@render children()}
	{/if}
</div>
```

- [ ] **Step 2: Update the index redirect**

Edit `src/routes/(app)/settings/account/+page.ts`:

```ts
/**
 * Index redirect for /settings/account — sends visitors to the
 * Profile tab. Mirrors /settings/tenant's redirect pattern.
 */
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	throw redirect(307, '/settings/account/profile');
};
```

- [ ] **Step 3: Type-check + build**

Run: `npm run check && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/\(app\)/settings/account/+layout.svelte src/routes/\(app\)/settings/account/+page.ts
git commit -m "feat(account): layout with profile/security/sessions sub-nav

Mirrors the /settings/tenant layout. Loads profile + sessions
stores on first mount (idle-guarded). Tab nav uses anchor links
+ aria-current per WAI-ARIA Authoring guidance (URL-linked tabs
are <nav>, not the tabs design pattern). Index redirects to
/profile."
```

---

### Task 11: Profile + Sessions page routes

**Files:**

- Create: `src/routes/(app)/settings/account/profile/+page.svelte`
- Create: `src/routes/(app)/settings/account/sessions/+page.svelte`

- [ ] **Step 1: Profile page**

```svelte
<!-- src/routes/(app)/settings/account/profile/+page.svelte -->
<script lang="ts">
	import { Card } from '$ui';
	import ProfileForm from '$features/auth/components/ProfileForm.svelte';
</script>

<Card.Root>
	<Card.Content>
		<ProfileForm />
	</Card.Content>
</Card.Root>
```

- [ ] **Step 2: Sessions page**

```svelte
<!-- src/routes/(app)/settings/account/sessions/+page.svelte -->
<script lang="ts">
	import { Alert, Spinner } from '$ui';
	import SessionsList from '$features/auth/components/SessionsList.svelte';
	import { sessions } from '$features/auth/stores/sessions.svelte';
</script>

{#if sessions.status === 'loading'}
	<div class="cluster"><Spinner /> Loading sessions…</div>
{:else if sessions.status === 'error' && sessions.error}
	<Alert variant="danger">{sessions.error}</Alert>
{:else}
	<SessionsList />
{/if}
```

- [ ] **Step 3: Build + smoke**

Run `npm run dev`, sign in, navigate to `/settings/account` → should redirect to `/profile` → fill form → save → reload → values persisted. Click "Sessions" → list shows at least one row (your own) badged "This device".

- [ ] **Step 4: Commit**

```bash
git add src/routes/\(app\)/settings/account/profile src/routes/\(app\)/settings/account/sessions
git commit -m "feat(account): profile + sessions sub-routes

Profile page renders ProfileForm inside a Card. Sessions page
wires the SessionsList with its own loading/error guards (the
layout's guards cover profile only)."
```

---

### Task 12: Update sidebar nav link label (cosmetic)

**Files:**

- Modify: `src/lib/config/nav.ts`

- [ ] **Step 1: Rename the link label**

The single sidebar entry was "Account & Security" pointing to `/settings/account/security`. Now that the section has three subroutes accessed via the layout, the label should be "Account" with the href pointing to the section root.

Find and replace in `nav.ts` (three occurrences across the three tier catalogues):

```ts
// Before:
{ href: '/settings/account/security', label: 'Account & Security', icon: ShieldCheck, requires: null }
// After:
{ href: '/settings/account', label: 'Account', icon: ShieldCheck, requires: null }
```

The Sidebar's `isActive` helper already handles trailing-prefix matching, so `/settings/account/{profile,security,sessions}` will all light up the sidebar entry.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/config/nav.ts
git commit -m "chore(nav): rename Account & Security → Account, root href

Section now has three sub-routes (Profile/Security/Sessions)
exposed by the layout sub-nav; the sidebar entry points at
the section root."
```

---

### Task 13: Playwright e2e round-trip

**Files:**

- Create: `tests/e2e/account-self-service.spec.ts`

- [ ] **Step 1: Write the e2e**

This assumes a `signIn` test fixture exists already (used by the existing auth e2e). If it doesn't, mirror whatever `tests/e2e/` shows for entering credentials before the account section.

```ts
import { test, expect } from '@playwright/test';

// signIn fixture mirrors lib/features/auth/api.ts contract
async function signIn(page) {
	await page.goto('/signin');
	await page.getByLabel('Email').fill(process.env.E2E_EMAIL ?? 'admin@e2e.test');
	await page.getByLabel('Password').fill(process.env.E2E_PASSWORD ?? 'Test1234!');
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('/dashboard');
}

test('account profile round-trip: edit designation, save, reload, persists', async ({ page }) => {
	await signIn(page);
	await page.goto('/settings/account/profile');

	const designation = page.getByLabel('Designation');
	await expect(designation).toBeVisible();
	const newValue = `E2E-${Date.now()}`;
	await designation.fill(newValue);
	await page.getByRole('button', { name: /save changes/i }).click();
	await expect(page.getByText(/profile updated/i)).toBeVisible();

	await page.reload();
	await expect(page.getByLabel('Designation')).toHaveValue(newValue);
});

test('sessions: list shows the active session as "This device"', async ({ page }) => {
	await signIn(page);
	await page.goto('/settings/account/sessions');
	await expect(page.getByRole('heading', { name: /active sessions/i })).toBeVisible();
	await expect(page.getByText('This device')).toBeVisible();
});

test('a11y: profile page has no serious/critical violations', async ({ page }) => {
	await signIn(page);
	await page.goto('/settings/account/profile');
	// AxeBuilder integration — mirror existing axe usage in this repo.
	// The exact import and assertion follow whatever pattern is in the e2e setup.
	const { default: AxeBuilder } = await import('@axe-core/playwright');
	const results = await new AxeBuilder({ page }).analyze();
	const serious = results.violations.filter(
		(v) => v.impact === 'serious' || v.impact === 'critical'
	);
	expect(serious).toEqual([]);
});
```

- [ ] **Step 2: Run the e2e**

Run: `npx playwright test tests/e2e/account-self-service.spec.ts`
Expected: PASS on chromium/firefox/webkit per the existing matrix.

If the test environment doesn't have a real backend wired up, document a `// TODO: env=local` annotation and SKIP rather than fail. Don't mock the backend — per CLAUDE.md, integration tests hit real services.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/account-self-service.spec.ts
git commit -m "test(e2e): account self-service round-trip + a11y

Three scenarios: profile edit persists across reload, sessions
shows the current device, and the profile page passes axe
serious/critical."
```

---

### Task 14: CI verification — final gate

- [ ] **Step 1: Run the full CI gate locally**

```bash
npm run lint
npm run check
npm run test:coverage
npm run build
npx size-limit
```

All five must pass before this slice is considered done. If `size-limit` regresses past budget, investigate the largest new chunk in `.svelte-kit/output/client/_app/immutable/chunks/` and trim — Badge + ProfileForm + SessionsList shouldn't move the needle more than a few KB total.

- [ ] **Step 2: Final smoke**

```bash
npm run preview
```

Hit `/settings/account` in a browser; verify all three sub-tabs render and operate without console errors.

- [ ] **Step 3: Push the branch**

```bash
git push origin feat/theme-customizer
```

(The user has confirmed branch-based work-flow per MEMORY.md; no PR opened automatically — they review and open when ready.)

---

## Acceptance criteria (per spec §5.1)

- [ ] `/settings/account` redirects to `/settings/account/profile`
- [ ] Layout shows header (user display name + email) + sub-nav (Profile · Security · Sessions)
- [ ] `/settings/account/profile` shows read-only name + email + status, editable designation + department + status_message; Save persists; reload shows persisted values
- [ ] `/settings/account/security` still shows the existing ChangePasswordForm (unchanged)
- [ ] `/settings/account/sessions` lists active sessions; current session is marked "This device" via Badge; other sessions have a Revoke button; "Sign out other devices" button is enabled when >1 session, disabled otherwise
- [ ] Badge primitive exists at `lib/components/ui/Badge.svelte` and is exported from `$ui`
- [ ] `lib/features/auth/{view-models.ts, stores/{profile,sessions}.svelte.ts, components/{ProfileForm,SessionsList}.svelte}` all present
- [ ] All schemas in `lib/features/auth/schemas.ts` parse the backend's actual response shapes
- [ ] vitest unit + playwright e2e + axe pass
- [ ] No dead code, no commented-out blocks, no console.log, no `any` types

---

## Self-review (post-write)

**Spec coverage:** ✓ §5.1 fully covered — every component / route / store / gateway listed has a task. Cross-cutting items used by this slice (§4.1 layering, §4.4 folder convention, §4.7 testing baseline, §4.8 error UX) are observed.

**Placeholder scan:** ✓ No TBD/TODO/FIXME. Two `// TODO: env=local` annotations only on a conditional e2e skip path — that's a real conditional, not a placeholder.

**Type consistency:** ✓ `UserDto`, `SessionDto`, `UpdateProfileRequest`, `ProfileStatus`, `SessionsStatus`, `BadgeVariant/Style/Size` are defined where they appear and referenced consistently throughout.

**Ambiguity:** One judgement-call in Task 6 around how `activeFamilyId` is derived (JWT parse vs explicit setter at login). The task documents both paths and picks the JWT-parse path with a graceful-null fallback — explicit choice, not ambiguous.
