# Slice 4 — Operator tenant management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Ship the platform-operator surface for managing tenants — register new tenants (with seed-admin credential capture), view tenant detail, suspend / activate / mark-for-deletion / restore. RBAC-gated to platform tier (`platform.tenants.view` / `platform.tenants.create` / `platform.tenants.manage`).

**Architecture:** New feature module `lib/features/operator/tenants/`. Routes `/operator/tenants` (list) + `/operator/tenants/[id]` (detail + actions). Reuses Drawer/Dialog/ConfirmDialog/Dropdown/Pagination/EmptyState primitives from slice 2.

**Spec reference:** `docs/superpowers/specs/2026-05-18-identity-module-completion-design.md` §5.4.

---

## ⚠ Backend gaps (noted in spec §7)

1. **`GET /api/v1/tenants` (list) does NOT exist.** The list page can't fetch a paginated tenant collection. Workaround: list page accepts a search box where operators paste a tenant ID or slug; the page calls `GET /v1/tenants/{id}` for that key and renders a single-row result. When the backend ships the list endpoint, the list page swaps to a real listing — the feature module is structured so the gateway addition is a one-liner.
2. **`POST /api/v1/tenants` is currently UNAUTHENTICATED.** Used by seed tooling; the frontend gates on `platform.tenants.create` regardless. Hardening is a separate backend task — not a frontend blocker.

These are tracked; slice 4 proceeds with the rest.

---

## Backend contract (what's available)

```
POST   /api/v1/tenants                                    → { tenant_id, person_id, membership_id }   (no auth currently)
                                                            body: RegisterTenantRequest (slug, legal_name, display_name, admin_email, admin_password, admin_first_name, admin_last_name)
GET    /api/v1/tenants/{id}                               → TenantDto                                  auth + identity.tenants.view (caller's own only) OR platform.tenants.view (any tenant — operator)
POST   /api/v1/tenants/{id}/suspend                       → 204                                        auth + platform.tenants.manage
                                                            body: { reason }
POST   /api/v1/tenants/{id}/activate                      → 204                                        auth + platform.tenants.manage
POST   /api/v1/tenants/{id}/mark-for-deletion             → 204                                        auth + platform.tenants.manage
                                                            body: { reason }
POST   /api/v1/tenants/{id}/restore                       → 204                                        auth + platform.tenants.manage
```

`TenantDto` already in `lib/features/tenant/schemas.ts` from the existing tenant-settings feature. **Re-export** from operator/tenants schemas.

---

## File map

**Create:**

- `src/lib/features/operator/tenants/schemas.ts` — register-tenant request + response, suspend/mark-for-deletion request schemas (re-export tenantDtoSchema from $features/tenant)
- `src/lib/features/operator/tenants/types.ts` — inferred types
- `src/lib/features/operator/tenants/api.ts` — gateway functions
- `src/lib/features/operator/tenants/view-models.ts` — status badge + lifecycle helpers
- `src/lib/features/operator/tenants/stores/operator-tenants.svelte.ts` — class store (search-by-id, single-tenant cache, lifecycle mutations)
- `src/lib/features/operator/tenants/components/TenantsList.svelte`
- `src/lib/features/operator/tenants/components/CreateTenantDrawer.svelte`
- `src/lib/features/operator/tenants/components/SuspendDialog.svelte`
- `src/lib/features/operator/tenants/components/MarkForDeletionDialog.svelte`
- `src/lib/features/operator/tenants/components/TenantActionPanel.svelte`
- `src/routes/(app)/operator/tenants/+page.{ts,svelte}`
- `src/routes/(app)/operator/tenants/[id]/+page.{ts,svelte}`
- `tests/unit/features/operator/tenants/{schemas,view-models}.test.ts`
- `tests/e2e/operator-tenant-management.spec.ts`

**Modify:**

- `src/lib/config/nav.ts` — add `/operator/tenants` to PLATFORM_NAV under a new "Administration" section gated `platform.tenants.view`
- `src/lib/components/ui/index.ts` — no changes (all primitives already present)

---

## Task list

### Task 1: Bootstrap operator/tenants schemas + types

- [ ] **Step 1:** Create `src/lib/features/operator/tenants/schemas.ts`:

```ts
/**
 * Zod schemas for operator-side tenant management.
 *
 * tenantDtoSchema is re-exported from the existing tenant feature
 * (lib/features/tenant) — the same DTO shape serves both tenant-own
 * settings and operator cross-tenant ops.
 */
import { z } from 'zod';

export { tenantDtoSchema } from '$lib/features/tenant/schemas';

export const registerTenantRequestSchema = z
	.object({
		slug: z
			.string()
			.min(3)
			.max(60)
			.regex(
				/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
				'slug must be lowercase letters, digits, and dashes'
			),
		legal_name: z.string().min(2).max(200),
		display_name: z.string().min(2).max(200),
		admin_email: z.string().email(),
		admin_password: z.string().min(8).max(200),
		admin_first_name: z.string().min(1).max(120),
		admin_last_name: z.string().min(1).max(120)
	})
	.strict();

export const registerTenantResponseSchema = z.object({
	tenant_id: z.string(),
	person_id: z.string(),
	membership_id: z.string()
});

export const suspendTenantRequestSchema = z.object({ reason: z.string().min(1).max(500) }).strict();

export const markForDeletionRequestSchema = z
	.object({ reason: z.string().min(1).max(500) })
	.strict();
```

- [ ] **Step 2:** Create `types.ts` with `z.output<>` aliases for the four new schemas + re-export `TenantDto` from $features/tenant.

- [ ] **Step 3:** Write schema tests in `tests/unit/features/operator/tenants/schemas.test.ts` — slug regex valid + invalid, password min length, reason min length, all-strict throw on extras.

- [ ] **Step 4:** Verify `npm run check && npx vitest run tests/unit/features/operator/tenants/schemas.test.ts` pass. Commit:

```bash
git add src/lib/features/operator/tenants/{schemas,types}.ts tests/unit/features/operator/tenants/schemas.test.ts
git commit -m "feat(operator/tenants): bootstrap schemas + types

Operator-side tenant management feature module. Schemas:
RegisterTenantRequest (with slug regex + password min-8), suspend
+ mark-for-deletion reason captures. tenantDtoSchema re-exported
from the existing tenant feature."
```

---

### Task 2: Operator/tenants gateway

- [ ] **Step 1:** Create `src/lib/features/operator/tenants/api.ts`:

```ts
import { api } from '$api/client';
import { tenantDtoSchema, registerTenantResponseSchema } from './schemas';
import type {
	RegisterTenantRequest,
	RegisterTenantResponse,
	SuspendTenantRequest,
	MarkForDeletionRequest,
	TenantDto
} from './types';

/** Register a new tenant + seed admin. Returns IDs of all three
 *  created records; the seed-admin credentials are the caller's input
 *  and must be conveyed out-of-band (UI surfaces them post-201). */
export async function registerTenant(req: RegisterTenantRequest): Promise<RegisterTenantResponse> {
	const raw = await api.post<unknown>('/v1/tenants', req, { auth: false });
	return registerTenantResponseSchema.parse(raw);
}

/** Read a tenant by ID — operator-scoped (platform.tenants.view).
 *  Same endpoint the tenant feature uses; access is widened by
 *  the operator's permission claim. */
export async function getTenant(tenantId: string): Promise<TenantDto> {
	const raw = await api.get<unknown>(`/v1/tenants/${tenantId}`);
	return tenantDtoSchema.parse(raw);
}

export async function suspendTenant(tenantId: string, req: SuspendTenantRequest): Promise<void> {
	await api.post<void>(`/v1/tenants/${tenantId}/suspend`, req);
}

export async function activateTenant(tenantId: string): Promise<void> {
	await api.post<void>(`/v1/tenants/${tenantId}/activate`, {});
}

export async function markForDeletion(
	tenantId: string,
	req: MarkForDeletionRequest
): Promise<void> {
	await api.post<void>(`/v1/tenants/${tenantId}/mark-for-deletion`, req);
}

export async function restoreTenant(tenantId: string): Promise<void> {
	await api.post<void>(`/v1/tenants/${tenantId}/restore`, {});
}

/**
 * TODO(backend): GET /v1/tenants (list) does not yet exist.
 * When it ships, add `listTenants()` here returning a paginated
 * response, and update OperatorTenantsStore.load() to use it.
 */
```

`registerTenant` is called with `{ auth: false }` because the backend currently doesn't gate it. Once backend hardens, drop the option.

- [ ] **Step 2:** Verify + commit:

```bash
git add src/lib/features/operator/tenants/api.ts
git commit -m "feat(operator/tenants): gateway for register + lifecycle

5 typed wrappers — register / get / suspend / activate /
markForDeletion / restore. TODO note flags the missing list
endpoint as a backend prereq."
```

---

### Task 3: View-models + store

- [ ] **Step 1:** Create `src/lib/features/operator/tenants/view-models.ts`:

```ts
import type { TenantDto } from './types';

export type LifecycleVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function tenantLifecycleBadge(tenant: TenantDto): {
	label: string;
	variant: LifecycleVariant;
} {
	switch (tenant.status) {
		case 'active':
			return { label: 'Active', variant: 'success' };
		case 'suspended':
			return { label: 'Suspended', variant: 'warning' };
		case 'marked_for_deletion':
			return { label: 'Marked for deletion', variant: 'danger' };
		case 'pending':
			return { label: 'Pending', variant: 'info' };
		default:
			return { label: tenant.status, variant: 'neutral' };
	}
}

export function canSuspend(tenant: TenantDto): boolean {
	return tenant.status === 'active';
}

export function canActivate(tenant: TenantDto): boolean {
	return tenant.status === 'suspended';
}

export function canMarkForDeletion(tenant: TenantDto): boolean {
	return tenant.status === 'active' || tenant.status === 'suspended';
}

export function canRestore(tenant: TenantDto): boolean {
	return tenant.status === 'marked_for_deletion';
}
```

- [ ] **Step 2:** Create `src/lib/features/operator/tenants/stores/operator-tenants.svelte.ts`:

```ts
import {
	getTenant,
	registerTenant as registerApi,
	suspendTenant as suspendApi,
	activateTenant as activateApi,
	markForDeletion as markApi,
	restoreTenant as restoreApi
} from '$features/operator/tenants/api';
import type {
	TenantDto,
	RegisterTenantRequest,
	RegisterTenantResponse
} from '$features/operator/tenants/types';

export type OperatorTenantsStatus = 'idle' | 'loading' | 'ready' | 'mutating' | 'error';

/**
 * Until the backend exposes GET /v1/tenants (list), this store
 * operates as a one-tenant cache fed by manual lookup-by-ID. The
 * `list` field is a one-element array (or empty) so list-view
 * components can iterate without special-casing.
 *
 * Once backend ships the list endpoint, replace `lookupById` with a
 * proper `load()` that populates `list` with the full collection.
 */
export class OperatorTenantsStore {
	list = $state<TenantDto[]>([]);
	current = $state<TenantDto | null>(null);
	status = $state<OperatorTenantsStatus>('idle');
	error = $state<string | null>(null);

	async lookupById(tenantId: string): Promise<void> {
		const trimmed = tenantId.trim();
		if (!trimmed) {
			this.list = [];
			this.error = null;
			return;
		}
		this.status = 'loading';
		this.error = null;
		try {
			const tenant = await getTenant(trimmed);
			this.list = [tenant];
			this.status = 'ready';
		} catch (e) {
			this.list = [];
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to look up tenant';
		}
	}

	async loadDetail(tenantId: string): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			this.current = await getTenant(tenantId);
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load tenant';
		}
	}

	async register(req: RegisterTenantRequest): Promise<RegisterTenantResponse> {
		this.status = 'mutating';
		try {
			const resp = await registerApi(req);
			this.status = 'ready';
			return resp;
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to register tenant';
			throw e;
		}
	}

	async suspend(tenantId: string, reason: string): Promise<void> {
		await this.mutate(() => suspendApi(tenantId, { reason }), tenantId);
	}
	async activate(tenantId: string): Promise<void> {
		await this.mutate(() => activateApi(tenantId), tenantId);
	}
	async markForDeletion(tenantId: string, reason: string): Promise<void> {
		await this.mutate(() => markApi(tenantId, { reason }), tenantId);
	}
	async restore(tenantId: string): Promise<void> {
		await this.mutate(() => restoreApi(tenantId), tenantId);
	}

	reset(): void {
		this.list = [];
		this.current = null;
		this.status = 'idle';
		this.error = null;
	}

	private async mutate(op: () => Promise<void>, tenantId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await op();
			const fresh = await getTenant(tenantId);
			if (this.current?.id === tenantId) this.current = fresh;
			const idx = this.list.findIndex((t) => t.id === tenantId);
			if (idx >= 0) {
				const next = this.list.slice();
				next[idx] = fresh;
				this.list = next;
			}
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Operation failed';
			throw e;
		}
	}
}

export const operatorTenants = new OperatorTenantsStore();
```

- [ ] **Step 3:** Write view-model tests + commit:

```bash
git add src/lib/features/operator/tenants/{view-models.ts,stores/operator-tenants.svelte.ts} tests/unit/features/operator/tenants/view-models.test.ts
git commit -m "feat(operator/tenants): view-models + OperatorTenantsStore

Lifecycle badges + can{Suspend,Activate,MarkForDeletion,Restore}
predicates. Store has lookup-by-id (workaround until backend
ships GET /v1/tenants list endpoint) + register + lifecycle mutations."
```

---

### Task 4: CreateTenantDrawer

- [ ] **Step 1:** Create `src/lib/features/operator/tenants/components/CreateTenantDrawer.svelte`:

```svelte
<script lang="ts">
	import { Drawer, Button, Alert, Card } from '$ui';
	import { TextField, PasswordField } from '$lib/components/form';
	import { Copy, Icon } from '$icons';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import type { RegisterTenantRequest } from '$features/operator/tenants/types';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	let slug = $state('');
	let legalName = $state('');
	let displayName = $state('');
	let adminEmail = $state('');
	let adminPassword = $state('');
	let adminFirstName = $state('');
	let adminLastName = $state('');
	let error = $state<string | null>(null);
	let credentials = $state<{ email: string; password: string; tenantId: string } | null>(null);

	function reset() {
		slug = '';
		legalName = '';
		displayName = '';
		adminEmail = '';
		adminPassword = '';
		adminFirstName = '';
		adminLastName = '';
		error = null;
		credentials = null;
	}

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		const req: RegisterTenantRequest = {
			slug: slug.trim().toLowerCase(),
			legal_name: legalName.trim(),
			display_name: displayName.trim(),
			admin_email: adminEmail.trim(),
			admin_password: adminPassword,
			admin_first_name: adminFirstName.trim(),
			admin_last_name: adminLastName.trim()
		};
		try {
			const resp = await operatorTenants.register(req);
			credentials = {
				email: req.admin_email,
				password: req.admin_password,
				tenantId: resp.tenant_id
			};
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to register tenant';
		}
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

	const isPending = $derived(operatorTenants.status === 'mutating');
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
					Tenant <code>{credentials.tenantId}</code> registered. Share these credentials with the seed
					admin (one-time view — not retrievable):
				</Alert>
				<Card.Root class="mt-4">
					<Card.Content class="stack stack-tight">
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
					{#if error}<Alert variant="danger">{error}</Alert>{/if}
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

Add `Copy` to `$icons` registry if missing.

- [ ] Commit:

```bash
git add src/lib/features/operator/tenants/components/CreateTenantDrawer.svelte src/lib/icons/index.ts
git commit -m "feat(operator/tenants): CreateTenantDrawer

Register form for new tenant + seed CompanyOwner. On 201 the
drawer enters a credential-display state — admin email +
password rendered with copy-to-clipboard buttons + a warning
about the one-time view. The password forces a mustChangePassword
flow on first admin sign-in (server-controlled)."
```

---

### Task 5: Suspend + MarkForDeletion dialogs

- [ ] **Step 1:** `SuspendDialog.svelte` — same shape as DeactivateUserDialog from slice 2. ConfirmDialog variant="danger", required reason textarea.

```svelte
<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	type Props = { open: boolean; tenant: TenantDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	let reason = $state('');
	let error = $state<string | null>(null);
	const isPending = $derived(operatorTenants.status === 'mutating');

	async function onConfirm() {
		if (!tenant) return;
		error = null;
		try {
			await operatorTenants.suspend(tenant.id, reason.trim());
			reason = '';
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to suspend';
		}
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
		{#if error}<Alert variant="danger">{error}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
```

- [ ] **Step 2:** `MarkForDeletionDialog.svelte` — same shape, different copy, additional warning about reversibility window.

```svelte
<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	type Props = { open: boolean; tenant: TenantDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	let reason = $state('');
	let error = $state<string | null>(null);
	const isPending = $derived(operatorTenants.status === 'mutating');

	async function onConfirm() {
		if (!tenant) return;
		error = null;
		try {
			await operatorTenants.markForDeletion(tenant.id, reason.trim());
			reason = '';
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to mark for deletion';
		}
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
		{#if error}<Alert variant="danger">{error}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
```

- [ ] Commit:

```bash
git add src/lib/features/operator/tenants/components/{SuspendDialog,MarkForDeletionDialog}.svelte
git commit -m "feat(operator/tenants): SuspendDialog + MarkForDeletionDialog

Both ConfirmDialog variant=danger with required reason capture
(audited). Mark-for-deletion adds a 30-day reversibility warning
matching the backend contract."
```

---

### Task 6: TenantActionPanel + TenantsList

- [ ] **Step 1:** `TenantActionPanel.svelte` — buttons matching the tenant's current state.

```svelte
<script lang="ts">
	import { Button, Card } from '$ui';
	import { Pause, Play, Trash2, RotateCcw, Icon } from '$icons';
	import {
		canSuspend,
		canActivate,
		canMarkForDeletion,
		canRestore
	} from '$features/operator/tenants/view-models';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import { hasPermission } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	type Props = {
		tenant: TenantDto;
		onAction: (action: 'suspend' | 'mark', tenant: TenantDto) => void;
	};

	let { tenant, onAction }: Props = $props();

	const canManage = $derived(hasPermission(session.principal, 'platform.tenants.manage'));
	const isPending = $derived(operatorTenants.status === 'mutating');

	async function activate() {
		try {
			await operatorTenants.activate(tenant.id);
		} catch {
			/* error surfaced via store */
		}
	}
	async function restore() {
		try {
			await operatorTenants.restore(tenant.id);
		} catch {
			/* error surfaced via store */
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Lifecycle</Card.Title>
		<Card.Description
			>{canManage
				? 'Operator-tier mutations on this tenant.'
				: 'Read-only — you lack platform.tenants.manage.'}</Card.Description
		>
	</Card.Header>
	<Card.Content class="cluster">
		{#if canManage && canSuspend(tenant)}
			<Button variant="ghost" onclick={() => onAction('suspend', tenant)} disabled={isPending}>
				<Icon icon={Pause} size="sm" /> Suspend
			</Button>
		{/if}
		{#if canManage && canActivate(tenant)}
			<Button variant="ghost" onclick={activate} loading={isPending}>
				<Icon icon={Play} size="sm" /> Activate
			</Button>
		{/if}
		{#if canManage && canMarkForDeletion(tenant)}
			<Button variant="danger" onclick={() => onAction('mark', tenant)} disabled={isPending}>
				<Icon icon={Trash2} size="sm" /> Mark for deletion
			</Button>
		{/if}
		{#if canManage && canRestore(tenant)}
			<Button variant="ghost" onclick={restore} loading={isPending}>
				<Icon icon={RotateCcw} size="sm" /> Restore
			</Button>
		{/if}
	</Card.Content>
</Card.Root>
```

Ensure `Pause`, `Play`, `RotateCcw` icons in registry.

- [ ] **Step 2:** `TenantsList.svelte` — search box + result row + create button. No pagination (single result at a time until backend lists).

```svelte
<script lang="ts">
	import { Alert, Badge, Button, Card, EmptyState, Spinner } from '$ui';
	import { Building2, Plus, Search, Icon } from '$icons';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import { hasPermission } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';
	import CreateTenantDrawer from './CreateTenantDrawer.svelte';

	let createOpen = $state(false);
	let search = $state('');
	let pending = $state(false);

	const canCreate = $derived(hasPermission(session.principal, 'platform.tenants.create'));

	async function onSearch(e: SubmitEvent) {
		e.preventDefault();
		pending = true;
		try {
			await operatorTenants.lookupById(search.trim());
		} finally {
			pending = false;
		}
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

	<Alert variant="info">
		Listing endpoint pending on the backend. For now, look up a tenant by ID or slug below.
	</Alert>

	<form class="cluster" onsubmit={onSearch}>
		<input
			type="search"
			placeholder="Tenant ID or slug"
			bind:value={search}
			class="glass-input flex-1 rounded-md px-3 py-2 text-sm"
		/>
		<Button type="submit" loading={pending || operatorTenants.status === 'loading'}>
			<Icon icon={Search} size="sm" /> Look up
		</Button>
	</form>

	{#if operatorTenants.status === 'error' && operatorTenants.error}
		<Alert variant="danger" title="Lookup failed">{operatorTenants.error}</Alert>
	{:else if operatorTenants.list.length === 0 && operatorTenants.status !== 'idle'}
		<EmptyState icon={Building2} title="No match" description="Try a different ID or slug." />
	{:else if operatorTenants.list.length > 0}
		<ul class="stack stack-tight" aria-label="Tenants">
			{#each operatorTenants.list as t (t.id)}
				{@const badge = tenantLifecycleBadge(t)}
				<li>
					<Card.Root>
						<Card.Content class="grid grid-cols-[1fr_auto] items-center gap-4">
							<div class="stack stack-tight">
								<div class="cluster cluster-tight">
									<a
										href="/operator/tenants/{t.id}"
										class="h5 text-[var(--color-fg)] hover:underline">{t.display_name}</a
									>
									<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
								</div>
								<p class="caption text-[var(--color-fg-muted)]">
									{t.slug} · {t.legal_name}
								</p>
							</div>
							<a
								href="/operator/tenants/{t.id}"
								class="label text-[var(--color-primary)] hover:underline">Open →</a
							>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState
			icon={Building2}
			title="Search for a tenant"
			description="Paste a tenant ID or slug above to load its detail page."
		/>
	{/if}
</div>

<CreateTenantDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
```

- [ ] Commit:

```bash
git add src/lib/features/operator/tenants/components/{TenantActionPanel,TenantsList}.svelte src/lib/icons/index.ts
git commit -m "feat(operator/tenants): TenantActionPanel + TenantsList

Action panel renders lifecycle buttons gated on
platform.tenants.manage + state predicates (can{Suspend,Activate,
Mark,Restore}). List page accepts a search-by-id workaround since
GET /v1/tenants list endpoint is pending."
```

---

### Task 7: Routes + nav

- [ ] **Step 1:** Routes:

```ts
// src/routes/(app)/operator/tenants/+page.ts
import { redirect } from '@sveltejs/kit';
import { session } from '$features/auth/stores/session.svelte';
import { hasPermission } from '$features/auth/tier';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	if (!hasPermission(session.principal, 'platform.tenants.view')) {
		throw redirect(303, '/dashboard');
	}
};
```

```svelte
<!-- src/routes/(app)/operator/tenants/+page.svelte -->
<script lang="ts">
	import TenantsList from '$features/operator/tenants/components/TenantsList.svelte';
</script>

<svelte:head><title>Tenants · LeadKart</title></svelte:head>

<TenantsList />
```

Detail page:

```ts
// src/routes/(app)/operator/tenants/[id]/+page.ts
import { redirect, error } from '@sveltejs/kit';
import { session } from '$features/auth/stores/session.svelte';
import { hasPermission } from '$features/auth/tier';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	if (!hasPermission(session.principal, 'platform.tenants.view')) {
		throw redirect(303, '/dashboard');
	}
	if (!params.id) throw error(404, 'Tenant not found');
	return { tenantId: params.id };
};
```

```svelte
<!-- src/routes/(app)/operator/tenants/[id]/+page.svelte -->
<script lang="ts">
	import { Alert, Badge, Card, Spinner } from '$ui';
	import TenantActionPanel from '$features/operator/tenants/components/TenantActionPanel.svelte';
	import SuspendDialog from '$features/operator/tenants/components/SuspendDialog.svelte';
	import MarkForDeletionDialog from '$features/operator/tenants/components/MarkForDeletionDialog.svelte';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import type { TenantDto } from '$features/operator/tenants/types';

	let { data } = $props();

	let suspendOpen = $state(false);
	let markOpen = $state(false);
	let target = $state<TenantDto | null>(null);

	$effect(() => {
		if (data.tenantId) {
			operatorTenants.loadDetail(data.tenantId).catch(() => {});
		}
	});

	function onAction(action: 'suspend' | 'mark', tenant: TenantDto) {
		target = tenant;
		if (action === 'suspend') suspendOpen = true;
		else markOpen = true;
	}
</script>

<svelte:head
	><title>{operatorTenants.current?.display_name ?? 'Tenant'} · LeadKart</title></svelte:head
>

<div class="stack stack-relaxed">
	<a
		href="/operator/tenants"
		class="caption text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">← All tenants</a
	>

	{#if operatorTenants.status === 'loading'}
		<div class="flex justify-center py-16"><Spinner size={32} /></div>
	{:else if !operatorTenants.current}
		<Alert variant="warning" title="Tenant not found"
			>No tenant with that ID, or you don't have access.</Alert
		>
	{:else}
		{@const t = operatorTenants.current}
		{@const badge = tenantLifecycleBadge(t)}
		<header class="stack stack-tight">
			<div class="cluster cluster-tight">
				<h1 class="h1">{t.display_name}</h1>
				<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
			</div>
			<p class="caption text-[var(--color-fg-muted)]">
				{t.slug} · {t.legal_name} · ID <code>{t.id}</code>
			</p>
		</header>

		<Card.Root>
			<Card.Header>
				<Card.Title>Profile</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="grid grid-cols-2 gap-x-6 gap-y-2">
					<div>
						<dt class="caption text-[var(--color-fg-muted)]">GSTIN</dt>
						<dd class="body-base text-[var(--color-fg)]">{t.gst_number || '—'}</dd>
					</div>
					<div>
						<dt class="caption text-[var(--color-fg-muted)]">PAN</dt>
						<dd class="body-base text-[var(--color-fg)]">{t.pan_number || '—'}</dd>
					</div>
					<div>
						<dt class="caption text-[var(--color-fg-muted)]">Drug licence</dt>
						<dd class="body-base text-[var(--color-fg)]">{t.drug_licence_number || '—'}</dd>
					</div>
					<div>
						<dt class="caption text-[var(--color-fg-muted)]">Phone</dt>
						<dd class="body-base text-[var(--color-fg)]">{t.admin_phone || '—'}</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		<TenantActionPanel tenant={t} {onAction} />
	{/if}
</div>

<SuspendDialog bind:open={suspendOpen} tenant={target} onOpenChange={(o) => (suspendOpen = o)} />
<MarkForDeletionDialog bind:open={markOpen} tenant={target} onOpenChange={(o) => (markOpen = o)} />
```

- [ ] **Step 2:** Update `src/lib/config/nav.ts` — add to PLATFORM_NAV under an Administration section:

```ts
{
	title: 'Administration',
	items: [
		{ href: '/operator/tenants', label: 'Tenants', icon: Building2, requires: 'platform.tenants.view' }
	]
}
```

`Building2` is already imported in nav.ts.

- [ ] Commit:

```bash
git add "src/routes/(app)/operator" src/lib/config/nav.ts
git commit -m "feat(operator/tenants): /operator/tenants + detail routes + nav

Gated on platform.tenants.view. List route shows the lookup-by-id
workaround + Create button (gated on platform.tenants.create).
Detail route shows tenant profile + TenantActionPanel + wires
SuspendDialog and MarkForDeletionDialog."
```

---

### Task 8: E2e + CI gate

- [ ] **Step 1:** `tests/e2e/operator-tenant-management.spec.ts` — 2 tests: list-with-info-banner renders + a11y. Mock principal with `platform.tenants.view` + `platform.tenants.create` permissions, mock `GET /v1/tenants/{id}` lookup as 404 for the no-match path.

- [ ] **Step 2:** CI:

```
npm run lint && npm run check && npm run test:coverage && npm run build && npx size-limit && npx playwright test --list
```

All must pass. Push. Report slice 4 summary.

---

## Acceptance criteria

- [ ] `/operator/tenants` route exists, gated on `platform.tenants.view`
- [ ] List page shows info banner re: missing list endpoint + search-by-id + Create button (perm-gated)
- [ ] Looking up a known tenant ID returns a card with status badge + link to detail
- [ ] Create drawer collects all 7 register fields, on 201 shows credential-display state with copy buttons
- [ ] `/operator/tenants/[id]` shows tenant profile + lifecycle action panel
- [ ] Suspend / mark-for-deletion dialogs collect audited reason
- [ ] Activate / restore fire directly from the panel
- [ ] Nav adds `/operator/tenants` to PLATFORM_NAV under "Administration"
- [ ] CI gate green
