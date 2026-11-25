<script lang="ts">
	import { z } from 'zod';
	import { _ } from 'svelte-i18n';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { FormSheet, TagInput } from '#lib/components/form/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import { Alert } from '#lib/components/ui/index.ts';
	import {
		replacePermissionOverridesMutation,
		userDetailQuery
	} from '#lib/features/users/queries.ts';
	import type { UserDto } from '#lib/features/users/types.ts';
	import { displayName, session } from '#lib/features/auth/index.ts';
	import { ConflictError, ValidationError } from '#lib/api/errors.ts';
	import { formatDate } from '#lib/utils/format.ts';
	import { PLATFORM_MANAGED_ROLE, mayConferPlatformManaged } from '#lib/features/roles/index.ts';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	// Go refuses (403 grant_exceeds_authority) conferring a role-management name on a member's override, as a grant AND
	// as a revocation, unless the caller is LeadKart staff in LeadKart's own tenant (`mayConferPlatformManaged`).
	// Taking one away is always allowed, so a revocation the member already has may stay in the list. An operator scoped
	// into LeadKart's own tenant is not in a company (`session.inCompanyScope`).
	let baseRevoked: ReadonlySet<string> = new Set();
	// A grant the member already has may stay too (Go counts only a new or extended grant as conferred).
	let baseGranted: ReadonlySet<string> = new Set();
	const may = () => mayConferPlatformManaged(session.capabilities, session.inCompanyScope);
	const schema = z.object({
		granted: z
			.array(z.string())
			.refine(
				(names) => may() || !names.some((n) => PLATFORM_MANAGED_ROLE.has(n) && !baseGranted.has(n)),
				{ message: 'form.errors.permissionNotGrantable' }
			),
		revoked: z
			.array(z.string())
			.refine(
				(names) => may() || !names.some((n) => PLATFORM_MANAGED_ROLE.has(n) && !baseRevoked.has(n)),
				{ message: 'form.errors.permissionNotRevocable' }
			)
	});

	const mutation = replacePermissionOverridesMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);

	// A save REPLACES the member's whole set, so the form is seeded from Go's read of it (`GET /v1/users/{id}`,
	// which sends `permission_overrides` only to a caller who may act on this member) and the sheet waits for it.
	const detail = userDetailQuery(() => (open && user ? user.membership_id : ''));
	const overrides = $derived(detail.data?.permission_overrides);
	const ready = $derived(
		open && overrides !== undefined && detail.data?.overrides_version !== undefined
	);
	// The version the form was opened on. A save sends THIS one, never a newer read: after a conflict the person
	// reopens the panel and sees the current set, so a second Save cannot overwrite what changed meanwhile.
	let baseVersion = '';

	/** The live grants that end, by name (a re-sent time-bound grant keeps its end date; a new one is permanent). */
	const endingGrants = $derived((overrides?.granted ?? []).filter((g) => g.expires_at));

	// the names Go refused as both granted and revoked (it sends the code only: the form compares its own two lists)
	let both = $state<string[]>([]);

	async function onSubmit(values: z.output<typeof schema>) {
		if (!user) return;
		both = [];
		try {
			await mutation.mutateAsync({
				id: user.membership_id,
				body: { ...values, overrides_version: baseVersion }
			});
		} catch (err) {
			if (err instanceof ConflictError) void detail.refetch();
			if (err instanceof ValidationError && err.fields.revoked === 'also_granted')
				both = values.granted.filter((name) => values.revoked.includes(name));
			// a refusal with no field named: one line for the whole set
			if (err instanceof ValidationError && !err.fields.granted && !err.fields.revoked)
				throw new ValidationError({ granted: 'form.errors.permissionNamesInvalid' }, err.status);
			throw err;
		}
	}

	function close() {
		open = false;
		onOpenChange(false);
	}
</script>

{#if open && !ready}
	<!-- the read has not answered yet, failed, or Go withheld the overrides: say which, offer no form -->
	<Sheet.Root
		bind:open={() => open, (v) => (v ? undefined : close())}
		onOpenChange={(v) => {
			if (!v) close();
		}}
	>
		<Sheet.Content size="md">
			<Sheet.Header class="border-border border-b pe-14">
				<Sheet.Title>
					{$_('pages.users.overrides.title', {
						values: { name: user ? displayName(user) : $_('pages.member.fallbackTitle') }
					})}
				</Sheet.Title>
			</Sheet.Header>
			<Sheet.Body>
				{#if detail.isPending}
					<p class="body-sm text-muted-foreground" role="status">
						{$_('pages.users.overrides.loading')}
					</p>
				{:else if detail.isError}
					<Alert variant="destructive">{$_('pages.users.overrides.loadFailed')}</Alert>
				{:else}
					<Alert variant="info">{$_('pages.users.overrides.unavailable')}</Alert>
				{/if}
			</Sheet.Body>
		</Sheet.Content>
	</Sheet.Root>
{/if}

<FormSheet
	bind:open={() => ready, (v) => (v ? undefined : close())}
	{onOpenChange}
	title={$_('pages.users.overrides.title', {
		values: { name: user ? displayName(user) : $_('pages.member.fallbackTitle') }
	})}
	description="Atomic replace: this exact set of grants and revokes overlays on top of role-default permissions. Empty lists clear the overlay."
	submitLabel="Apply overrides"
	{schema}
	{onSubmit}
	initial={() => {
		baseVersion = detail.data?.overrides_version ?? '';
		baseRevoked = new Set(overrides?.revoked ?? []);
		baseGranted = new Set((overrides?.granted ?? []).map((g) => g.name));
		return {
			granted: (overrides?.granted ?? []).map((g) => g.name),
			revoked: [...(overrides?.revoked ?? [])]
		};
	}}
	formId="permission-overrides-form"
	errorLines={{
		403: "You don't have permission to manage permission overrides.",
		404: 'This member could not be found.',
		// Go: overrides_changed (a time-limited grant ended, a request was approved, or someone else saved)
		409: $_('errors.code.overrides_changed')
	}}
>
	{#snippet fields(form)}
		<TagInput
			label="Extra grants"
			name="granted"
			placeholder="e.g. crm.leads.assign"
			bind:value={form.values.granted}
			hint={endingGrants.some((g) => form.values.granted.includes(g.name))
				? endingGrants
						.filter((g) => form.values.granted.includes(g.name))
						.map((g) =>
							$_('pages.users.overrides.endsOn', {
								values: { name: g.name, date: formatDate(g.expires_at) }
							})
						)
						.join(' ')
				: undefined}
			error={form.errors.granted}
		/>
		<TagInput
			label="Revocations"
			name="revoked"
			placeholder="e.g. crm.leads.manage"
			bind:value={form.values.revoked}
			hint={both.length > 0
				? $_('pages.users.overrides.alsoGrantedNames', { values: { names: both.join(', ') } })
				: undefined}
			error={form.errors.revoked}
		/>
	{/snippet}
</FormSheet>
