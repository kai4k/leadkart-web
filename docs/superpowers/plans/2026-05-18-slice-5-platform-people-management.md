# Slice 5 — Platform people management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Ship the platform-operator surface for cross-tenant Person management — view a Person's identity + memberships across tenants, global-suspend / lift-suspension (any tenant), anonymise (DPDP irreversible).

**Architecture:** New feature `lib/features/operator/people/`. Routes `/operator/people` (list with search-by-id workaround) + `/operator/people/[id]` (detail). Reuses primitives extracted in slice 2-3.

**Spec reference:** `docs/superpowers/specs/2026-05-18-identity-module-completion-design.md` §5.5.

---

## ⚠ Backend gap

`GET /v1/platform/persons` (list) does NOT exist — same search-by-id workaround as slice 4 used originally. All other endpoints are present.

---

## Backend contract

```
GET    /api/v1/platform/persons/{personId}                         → PersonDto                                auth + platform.users.view
GET    /api/v1/platform/persons/{personId}/memberships             → { memberships: UserDto[] }               auth + platform.users.view
PATCH  /api/v1/platform/persons/{personId}/profile                 → 204    body: { first_name, last_name }   auth + platform.users.manage
POST   /api/v1/platform/persons/{personId}/global-suspend          → 204    body: { reason }                  auth + platform.users.manage
POST   /api/v1/platform/persons/{personId}/lift-global-suspension  → 204                                      auth + platform.users.manage
POST   /api/v1/platform/persons/{personId}/anonymise               → 204    body: { reason }                  auth + identity.users.anonymise
                                                                              (DPDP — irreversible)
```

`PersonDto` (from backend dto.go):

```
id, email, first_name, last_name,
is_active, is_anonymised, is_globally_suspended,
global_suspension_reason, globally_suspended_at,
created_at, anonymised_at
```

`UserDto` (membership) reuses the slice-1 schema in `lib/features/auth/schemas.ts`.

---

## File map

**Create:**

- `src/lib/features/operator/people/schemas.ts` — personDtoSchema, listPersonMembershipsResponseSchema, globalSuspendRequestSchema, updatePersonProfileRequestSchema, anonymisePersonRequestSchema
- `src/lib/features/operator/people/types.ts` — `z.output<>` aliases
- `src/lib/features/operator/people/api.ts` — gateway
- `src/lib/features/operator/people/view-models.ts` — `personDisplayName`, `personLifecycleBadge`, `canGloballySuspend`, `canLiftSuspension`, `canAnonymise`
- `src/lib/features/operator/people/stores/operator-people.svelte.ts` — class store w/ lookupById + loadDetail + mutations
- `src/lib/features/operator/people/components/PeopleList.svelte` (search-by-id, same shape as TenantsList)
- `src/lib/features/operator/people/components/PersonDetail.svelte` (identity card + memberships card + action panel)
- `src/lib/features/operator/people/components/GlobalSuspendDialog.svelte`
- `src/lib/features/operator/people/components/AnonymiseDialog.svelte` (two-step: typed-email confirmation + reason)
- `src/routes/(app)/operator/people/+page.{ts,svelte}`
- `src/routes/(app)/operator/people/[id]/+page.{ts,svelte}`
- `tests/unit/features/operator/people/{schemas,view-models}.test.ts`
- `tests/e2e/operator-people-management.spec.ts`

**Modify:**

- `src/lib/config/nav.ts` — add `/operator/people` to PLATFORM_NAV → Administration section after `/operator/tenants`

---

## Task list

### Task 1: Schemas + types + tests (one commit)

`personDtoSchema` mirrors PersonDto field-for-field. `globalSuspendRequestSchema` strict, reason min(1). `anonymisePersonRequestSchema` strict, reason min(1). Tests cover strict + min-length rejection.

```ts
// schemas.ts
import { z } from 'zod';
import { userDtoSchema } from '$lib/features/auth/schemas';

export const personDtoSchema = z.object({
	id: z.string(),
	email: z.string(),
	first_name: z.string(),
	last_name: z.string(),
	is_active: z.boolean(),
	is_anonymised: z.boolean(),
	is_globally_suspended: z.boolean(),
	global_suspension_reason: z.string().optional().default(''),
	globally_suspended_at: z.string().optional().default(''),
	created_at: z.string(),
	anonymised_at: z.string().optional().default('')
});

export const listPersonMembershipsResponseSchema = z.object({
	memberships: z.array(userDtoSchema)
});

export const globalSuspendRequestSchema = z.object({ reason: z.string().min(1).max(500) }).strict();

export const updatePersonProfileRequestSchema = z
	.object({
		first_name: z.string().min(1).max(120),
		last_name: z.string().min(1).max(120)
	})
	.strict();

export const anonymisePersonRequestSchema = z
	.object({ reason: z.string().min(1).max(500) })
	.strict();
```

```ts
// types.ts — z.output<> aliases for the 5 schemas
```

Commit: `feat(operator/people): bootstrap schemas + types`.

---

### Task 2: Gateway (one commit)

```ts
// api.ts
import { api } from '$api/client';
import { personDtoSchema, listPersonMembershipsResponseSchema } from './schemas';
import type {
	PersonDto,
	ListPersonMembershipsResponse,
	GlobalSuspendRequest,
	UpdatePersonProfileRequest,
	AnonymisePersonRequest
} from './types';

export async function getPerson(personId: string): Promise<PersonDto> {
	const raw = await api.get<unknown>(`/v1/platform/persons/${personId}`);
	return personDtoSchema.parse(raw);
}

export async function listPersonMemberships(
	personId: string
): Promise<ListPersonMembershipsResponse> {
	const raw = await api.get<unknown>(`/v1/platform/persons/${personId}/memberships`);
	return listPersonMembershipsResponseSchema.parse(raw);
}

export async function updatePersonProfile(
	personId: string,
	req: UpdatePersonProfileRequest
): Promise<void> {
	await api.patch<void>(`/v1/platform/persons/${personId}/profile`, req);
}

export async function globalSuspend(personId: string, req: GlobalSuspendRequest): Promise<void> {
	await api.post<void>(`/v1/platform/persons/${personId}/global-suspend`, req);
}

export async function liftGlobalSuspension(personId: string): Promise<void> {
	await api.post<void>(`/v1/platform/persons/${personId}/lift-global-suspension`, {});
}

export async function anonymisePerson(
	personId: string,
	req: AnonymisePersonRequest
): Promise<void> {
	await api.post<void>(`/v1/platform/persons/${personId}/anonymise`, req);
}

// TODO(backend): GET /v1/platform/persons list endpoint does not exist.
// When it ships, add listPersons() and update OperatorPeopleStore.load().
```

Commit: `feat(operator/people): gateway for person + suspension + anonymisation`.

---

### Task 3: View-models + store (one commit)

```ts
// view-models.ts
import type { PersonDto } from './types';

export function personDisplayName(p: PersonDto): string {
	const first = p.first_name.trim();
	const last = p.last_name.trim();
	if (first && last) return `${first} ${last}`;
	if (first) return first;
	if (last) return last;
	return p.email;
}

export function personLifecycleBadge(p: PersonDto): {
	label: string;
	variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
} {
	if (p.is_anonymised) return { label: 'Anonymised', variant: 'neutral' };
	if (p.is_globally_suspended) return { label: 'Globally suspended', variant: 'danger' };
	if (!p.is_active) return { label: 'Inactive', variant: 'warning' };
	return { label: 'Active', variant: 'success' };
}

export function canGloballySuspend(p: PersonDto): boolean {
	return !p.is_anonymised && !p.is_globally_suspended;
}

export function canLiftSuspension(p: PersonDto): boolean {
	return p.is_globally_suspended && !p.is_anonymised;
}

export function canAnonymise(p: PersonDto): boolean {
	return !p.is_anonymised;
}
```

```ts
// stores/operator-people.svelte.ts
import {
	getPerson,
	listPersonMemberships,
	globalSuspend,
	liftGlobalSuspension,
	anonymisePerson
} from '$features/operator/people/api';
import type { PersonDto } from '$features/operator/people/types';
import type { UserDto } from '$features/auth/types';

export type OperatorPeopleStatus = 'idle' | 'loading' | 'ready' | 'mutating' | 'error';

export class OperatorPeopleStore {
	list = $state<PersonDto[]>([]);
	current = $state<PersonDto | null>(null);
	memberships = $state<UserDto[]>([]);
	status = $state<OperatorPeopleStatus>('idle');
	error = $state<string | null>(null);

	async lookupById(personId: string): Promise<void> {
		const trimmed = personId.trim();
		if (!trimmed) {
			this.list = [];
			this.error = null;
			return;
		}
		this.status = 'loading';
		this.error = null;
		try {
			this.list = [await getPerson(trimmed)];
			this.status = 'ready';
		} catch (e) {
			this.list = [];
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Lookup failed';
		}
	}

	async loadDetail(personId: string): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			const [person, { memberships }] = await Promise.all([
				getPerson(personId),
				listPersonMemberships(personId)
			]);
			this.current = person;
			this.memberships = memberships;
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load person';
		}
	}

	async suspend(personId: string, reason: string): Promise<void> {
		await this.mutate(() => globalSuspend(personId, { reason }), personId);
	}
	async liftSuspension(personId: string): Promise<void> {
		await this.mutate(() => liftGlobalSuspension(personId), personId);
	}
	async anonymise(personId: string, reason: string): Promise<void> {
		await this.mutate(() => anonymisePerson(personId, { reason }), personId);
	}

	reset(): void {
		this.list = [];
		this.current = null;
		this.memberships = [];
		this.status = 'idle';
		this.error = null;
	}

	private async mutate(op: () => Promise<void>, personId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await op();
			const fresh = await getPerson(personId);
			if (this.current?.id === personId) this.current = fresh;
			const idx = this.list.findIndex((p) => p.id === personId);
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

export const operatorPeople = new OperatorPeopleStore();
```

Write at least 5 view-model tests. Commit: `feat(operator/people): view-models + OperatorPeopleStore`.

---

### Task 4: GlobalSuspendDialog + AnonymiseDialog (one commit)

`GlobalSuspendDialog` mirrors slice 4's SuspendDialog shape (ConfirmDialog variant=danger, required reason).

`AnonymiseDialog` is heavier — two-step: typed-email confirmation first, then reason capture. Per spec §5.5:

```svelte
<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { operatorPeople } from '$features/operator/people/stores/operator-people.svelte';
	import type { PersonDto } from '$features/operator/people/types';

	type Props = { open: boolean; person: PersonDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), person, onOpenChange }: Props = $props();

	let typedEmail = $state('');
	let reason = $state('');
	let error = $state<string | null>(null);
	const isPending = $derived(operatorPeople.status === 'mutating');
	const canConfirm = $derived(
		person !== null && typedEmail === person.email && reason.trim().length > 0
	);

	async function onConfirm() {
		if (!person || !canConfirm) return;
		error = null;
		try {
			await operatorPeople.anonymise(person.id, reason.trim());
			typedEmail = '';
			reason = '';
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Anonymisation failed';
		}
	}
</script>

<ConfirmDialog
	bind:open
	title="Anonymise {person?.email ?? 'person'}"
	description="DPDP irreversible: replaces all PII with placeholders, deactivates every Membership. The Person row is preserved for audit but no original data is recoverable."
	confirmLabel="Anonymise permanently"
	variant="danger"
	loading={isPending}
	{onOpenChange}
	{onConfirm}
>
	{#snippet body()}
		<Alert variant="danger">
			<strong>This cannot be undone.</strong> Type the email below to confirm.
		</Alert>
		<label class="stack stack-tight mt-4">
			<span class="label"
				>Type <code class="rounded bg-[var(--color-bg-muted)] px-1">{person?.email ?? ''}</code> to confirm</span
			>
			<input bind:value={typedEmail} class="glass-input rounded-md px-3 py-2 text-sm" />
		</label>
		<label class="stack stack-tight mt-4">
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
		{#if error}<Alert class="mt-4" variant="danger">{error}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
```

Commit: `feat(operator/people): GlobalSuspendDialog + AnonymiseDialog`.

---

### Task 5: PeopleList + PersonDetail (one commit)

`PeopleList` is essentially the same as slice 4's TenantsList shape — info banner about missing list endpoint + search-by-id + Card row per result.

`PersonDetail` page renders:

1. Identity Card: avatar (initials), display name, email, lifecycle badge
2. Memberships Card: table of tenant memberships (tenant_id, designation, role count, status)
3. Action panel: buttons gated by `platform.users.manage` + state predicates

Use Avatar + Badge primitives. Memberships table uses simple HTML markup (per CLAUDE.md, Table primitive not extracted yet).

Commit: `feat(operator/people): PeopleList + PersonDetail`.

---

### Task 6: Routes + nav (one commit)

Same pattern as slice 4:

- `/operator/people/+page.{ts,svelte}` — gated on `platform.users.view`, renders PeopleList
- `/operator/people/[id]/+page.{ts,svelte}` — loads detail, renders PersonDetail with action dialogs wired

Update `nav.ts` PLATFORM_NAV Administration section to include `{ href: '/operator/people', label: 'Platform users', icon: Users, requires: 'platform.users.view' }`. Use `UserCheck` or `Users` icon (`Users` likely already imported).

Commit: `feat(operator/people): routes + nav`.

---

### Task 7: E2e + CI gate (one commit + push)

`tests/e2e/operator-people-management.spec.ts` — 2 tests: list-with-banner renders + a11y. Same pattern as slice 4 e2e. Mock principal with `platform.users.view` + `platform.users.manage` + `identity.users.anonymise`.

Run full CI gate: lint, check, test:coverage, build, size-limit, playwright --list. Push. Report summary.

---

## Acceptance criteria

- [ ] `/operator/people` route gated on `platform.users.view`
- [ ] Search-by-id workaround in place + info banner
- [ ] Detail page shows identity, memberships across tenants, action panel
- [ ] Global suspend dialog with required reason + lift suspension button
- [ ] Anonymise dialog with typed-email + reason two-step confirmation + irreversible warning
- [ ] Nav: `/operator/people` under PLATFORM_NAV Administration
- [ ] CI gate green
