# Slice 6 — Operator impersonation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Ship the operator-impersonation flow — open a modal from any tenant's detail page (or `/operator/tenants`), capture a reason (≥10 chars) + duration, POST to start a session, display a persistent banner across all chrome with End-impersonation button.

**Architecture:** New feature `lib/features/operator/impersonation/`. No new routes — modal is mounted on TenantsList + tenant detail; banner is mounted in `(app)/+layout.svelte`. Reuses Dialog/ConfirmDialog/Button primitives.

**Spec reference:** `docs/superpowers/specs/2026-05-18-identity-module-completion-design.md` §5.6.

---

## Backend contract (CONFIRMED present)

```
POST   /api/v1/platform/impersonation/sessions               → { session_id, expires_at_utc }    auth + platform.tenants.view
                                                              body: { target_tenant_id, reason (>=10 chars), duration_minutes? (default 30, max 240) }
DELETE /api/v1/platform/impersonation/sessions/{sessionId}   → 204                                auth
GET    /api/v1/platform/impersonation/sessions               → { sessions: ImpersonationSessionDto[] }  auth
```

`ImpersonationSessionDto`: session_id, operator_id, target_tenant_id, reason, created_at, expires_at.

**Semantics (per backend):** Impersonation is an **audit-trail recorder** — the session records the operator's intent + reason. It does NOT issue new tokens or switch the operator's permission scope. The operator already has cross-tenant read via `is_super_user`; the session is the "for the record, I'm acting as tenant X" anchor required for SOC2 CC4.1 / DPDP §12 audit.

Frontend implication: the impersonation flow is a UX recording layer, not a permission switch. We don't reissue JWTs or set X-Impersonation headers. The banner exists to remind the operator their actions are flagged + audited.

---

## File map

**Create:**

- `src/lib/features/operator/impersonation/schemas.ts`
- `src/lib/features/operator/impersonation/types.ts`
- `src/lib/features/operator/impersonation/api.ts`
- `src/lib/features/operator/impersonation/stores/impersonation.svelte.ts`
- `src/lib/features/operator/impersonation/components/ImpersonateModal.svelte`
- `src/lib/features/operator/impersonation/components/ImpersonationBanner.svelte`
- `tests/unit/features/operator/impersonation/{schemas}.test.ts`
- `tests/e2e/operator-impersonation.spec.ts`

**Modify:**

- `src/routes/(app)/+layout.svelte` — mount `ImpersonationBanner` at the very top
- `src/lib/features/operator/tenants/components/TenantsList.svelte` — add "Impersonate" row action to each tenant card
- `src/routes/(app)/operator/tenants/[id]/+page.svelte` — add "Impersonate this tenant" button in the action panel area
- `src/lib/icons/index.ts` — ensure `UserCog` or `Eye` for the impersonate action

---

## Task list

### Task 1: Schemas + types (one commit)

```ts
// schemas.ts
import { z } from 'zod';

export const createImpersonationSessionRequestSchema = z
	.object({
		target_tenant_id: z.string().min(1),
		reason: z.string().min(10).max(500),
		duration_minutes: z.number().int().min(1).max(240).optional()
	})
	.strict();

export const createImpersonationSessionResponseSchema = z.object({
	session_id: z.string(),
	expires_at_utc: z.string()
});

export const impersonationSessionDtoSchema = z.object({
	session_id: z.string(),
	operator_id: z.string(),
	target_tenant_id: z.string(),
	reason: z.string(),
	created_at: z.string(),
	expires_at: z.string()
});

export const listImpersonationSessionsResponseSchema = z.object({
	sessions: z.array(impersonationSessionDtoSchema)
});
```

```ts
// types.ts — z.output<> aliases
```

Tests: strict-throw on extras, reason min length, duration range. Commit `feat(operator/impersonation): schemas + types`.

---

### Task 2: Gateway (one commit)

```ts
// api.ts
import { api } from '$api/client';
import {
	createImpersonationSessionResponseSchema,
	listImpersonationSessionsResponseSchema
} from './schemas';
import type {
	CreateImpersonationSessionRequest,
	CreateImpersonationSessionResponse,
	ListImpersonationSessionsResponse
} from './types';

export async function startImpersonation(
	req: CreateImpersonationSessionRequest
): Promise<CreateImpersonationSessionResponse> {
	const raw = await api.post<unknown>('/v1/platform/impersonation/sessions', req);
	return createImpersonationSessionResponseSchema.parse(raw);
}

export async function endImpersonation(sessionId: string): Promise<void> {
	await api.delete<void>(`/v1/platform/impersonation/sessions/${sessionId}`);
}

export async function listImpersonationSessions(): Promise<ListImpersonationSessionsResponse> {
	const raw = await api.get<unknown>('/v1/platform/impersonation/sessions');
	return listImpersonationSessionsResponseSchema.parse(raw);
}
```

Commit `feat(operator/impersonation): gateway`.

---

### Task 3: Store (one commit)

```ts
// stores/impersonation.svelte.ts
import {
	startImpersonation,
	endImpersonation,
	listImpersonationSessions
} from '$features/operator/impersonation/api';
import type {
	ImpersonationSessionDto,
	CreateImpersonationSessionRequest
} from '$features/operator/impersonation/types';

const ACTIVE_SESSION_KEY = 'leadkart-impersonation-session';

export type ImpersonationStatus = 'idle' | 'loading' | 'active' | 'mutating' | 'error';

/**
 * ImpersonationStore — tracks the operator's currently-active session.
 *
 * Persistence: the active session_id is persisted to localStorage so a
 * page reload doesn't lose the banner state. On mount, the store
 * reconciles with the server (GET /sessions) — if the persisted ID
 * is no longer active (expired / ended elsewhere), the local state
 * is cleared.
 */
export class ImpersonationStore {
	active = $state<ImpersonationSessionDto | null>(null);
	status = $state<ImpersonationStatus>('idle');
	error = $state<string | null>(null);

	/** Read the persisted ID + sync with server. Called once on app shell mount. */
	async reconcile(): Promise<void> {
		if (typeof window === 'undefined') return;
		const persistedId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
		if (!persistedId) {
			this.active = null;
			return;
		}
		this.status = 'loading';
		try {
			const { sessions } = await listImpersonationSessions();
			const match = sessions.find((s) => s.session_id === persistedId);
			if (match) {
				this.active = match;
				this.status = 'active';
			} else {
				window.localStorage.removeItem(ACTIVE_SESSION_KEY);
				this.active = null;
				this.status = 'idle';
			}
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load impersonation sessions';
		}
	}

	async start(req: CreateImpersonationSessionRequest): Promise<void> {
		this.status = 'mutating';
		this.error = null;
		try {
			const { session_id } = await startImpersonation(req);
			window.localStorage.setItem(ACTIVE_SESSION_KEY, session_id);
			// Server doesn't return the full Dto on POST; refetch to populate.
			await this.reconcile();
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to start impersonation';
			throw e;
		}
	}

	async end(): Promise<void> {
		if (!this.active) return;
		this.status = 'mutating';
		try {
			await endImpersonation(this.active.session_id);
			window.localStorage.removeItem(ACTIVE_SESSION_KEY);
			this.active = null;
			this.status = 'idle';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to end impersonation';
			throw e;
		}
	}
}

export const impersonation = new ImpersonationStore();
```

Commit `feat(operator/impersonation): store with localStorage persistence`.

---

### Task 4: ImpersonateModal (one commit)

```svelte
<script lang="ts">
	import { Dialog, Button, Alert } from '$ui';
	import { impersonation } from '$features/operator/impersonation/stores/impersonation.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	type Props = { open: boolean; tenant: TenantDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	let reason = $state('');
	let durationMinutes = $state(30);
	let error = $state<string | null>(null);

	const isPending = $derived(impersonation.status === 'mutating');
	const canSubmit = $derived(tenant !== null && reason.trim().length >= 10);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!tenant || !canSubmit) return;
		error = null;
		try {
			await impersonation.start({
				target_tenant_id: tenant.id,
				reason: reason.trim(),
				duration_minutes: durationMinutes
			});
			reason = '';
			durationMinutes = 30;
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to start impersonation';
		}
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content>
		<Dialog.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Impersonate {tenant?.display_name ?? 'tenant'}</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Records an audited session of your activity while acting on this tenant's behalf. All
					requests are logged with this session ID for the operator audit trail.
				</p>
			</div>
		</Dialog.Header>
		<Dialog.Body>
			<Alert variant="warning">
				Every action is auditable to you, with the reason below. End the session as soon as your
				task is complete.
			</Alert>
			<form id="impersonate-form" class="stack stack-relaxed mt-4" onsubmit={onSubmit}>
				<label class="stack stack-tight">
					<span class="label">Reason (required, audited — minimum 10 characters)</span>
					<textarea
						bind:value={reason}
						required
						minlength={10}
						maxlength={500}
						rows={3}
						class="glass-input w-full rounded-md px-3 py-2 text-sm"
					></textarea>
				</label>
				<label class="stack stack-tight">
					<span class="label">Duration (minutes — max 240)</span>
					<input
						type="number"
						bind:value={durationMinutes}
						min={1}
						max={240}
						class="glass-input rounded-md px-3 py-2 text-sm"
					/>
				</label>
				{#if error}<Alert variant="danger">{error}</Alert>{/if}
			</form>
		</Dialog.Body>
		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Dialog.Close>
			<Button type="submit" form="impersonate-form" disabled={!canSubmit} loading={isPending}>
				Start impersonation
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
```

Commit `feat(operator/impersonation): ImpersonateModal`.

---

### Task 5: ImpersonationBanner (one commit)

```svelte
<script lang="ts">
	import { Button } from '$ui';
	import { LogOut, Eye, Icon } from '$icons';
	import { impersonation } from '$features/operator/impersonation/stores/impersonation.svelte';

	const ending = $derived(impersonation.status === 'mutating');

	async function endNow() {
		try {
			await impersonation.end();
		} catch {
			/* error surfaced via store */
		}
	}
</script>

{#if impersonation.active}
	<div
		class="z-banner sticky inset-x-0 top-0 flex items-center justify-between gap-3 bg-[var(--color-warning-500)] px-4 py-2 text-white"
		style="z-index: var(--z-sticky); position: sticky; top: 0;"
		role="status"
		aria-live="polite"
	>
		<div class="cluster cluster-tight">
			<Icon icon={Eye} size="sm" />
			<span class="label-small">
				Impersonating tenant <code class="rounded bg-black/10 px-1"
					>{impersonation.active.target_tenant_id}</code
				>
				· Reason: {impersonation.active.reason}
				· Expires {new Date(impersonation.active.expires_at).toLocaleTimeString()}
			</span>
		</div>
		<Button
			variant="ghost"
			size="sm"
			loading={ending}
			onclick={endNow}
			class="!text-white hover:!bg-white/10"
		>
			<Icon icon={LogOut} size="sm" /> End impersonation
		</Button>
	</div>
{/if}
```

If `--z-sticky` isn't sufficient (banner needs to render ABOVE topbar), check tokens.css for `--z-banner` or add one. Use `--z-sticky + 1` or a dedicated higher token.

Commit `feat(operator/impersonation): ImpersonationBanner`.

---

### Task 6: Wire into AppShell + TenantsList + tenant detail (one commit)

`src/routes/(app)/+layout.svelte` — mount the banner at the very top, before the topbar. Also call `impersonation.reconcile()` in a $effect after the session is loaded.

`TenantsList` — add Dropdown row action "Impersonate" (or just add a button alongside "Open →"). Triggers ImpersonateModal with that tenant.

Tenant detail page — add an "Impersonate this tenant" button in the action panel.

Commit `feat(operator/impersonation): wire banner + trigger into shell + tenant pages`.

---

### Task 7: E2e + CI gate

Create `tests/e2e/operator-impersonation.spec.ts` — 2 tests:

1. ImpersonateModal opens from a tenant row + submits + banner renders post-success
2. a11y on the page with banner

Mock POST /v1/platform/impersonation/sessions → 201 with session_id; GET → list including the new session; DELETE → 204.

Run full CI gate (lint, check, test:coverage, build, size-limit, playwright --list). Push. Report slice 6 summary.

---

## Acceptance criteria

- [ ] POST/DELETE/GET impersonation endpoints wired with zod boundary parsing
- [ ] ImpersonateModal: target tenant + reason (≥10) + duration (1-240) capture
- [ ] On 201: banner appears above all chrome, persists across page reload via localStorage
- [ ] EndImpersonation button calls DELETE + clears banner
- [ ] Trigger lives in TenantsList row + tenant detail page
- [ ] All visuals via tokens — warning-500 background for banner
- [ ] CI gate green
