<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';
	import { deleteRoleMutation } from '#lib/features/roles/queries.ts';
	import type { RoleDto } from '#lib/features/roles/types.ts';
	import { ConflictError } from '#lib/api/errors.ts';
	import { roleHoldersLine } from '#lib/features/roles/view-models.ts';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = { open: boolean; role: RoleDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), role, onOpenChange }: Props = $props();

	const mutation = deleteRoleMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);

	// Who still holds the role, from the 409 `role_in_use` body (typed on ConflictError). Keyed by role and cleared on
	// every close, so a later open never shows the line of an earlier attempt.
	let refusal = $state<{ id: string; line: string | null } | null>(null);
	const held = $derived(refusal !== null && refusal.id === role?.id ? refusal.line : null);

	function handleOpenChange(next: boolean) {
		refusal = null;
		onOpenChange(next);
	}

	async function onConfirm() {
		if (!role) return;
		try {
			await mutation.mutateAsync(role.id);
		} catch (err) {
			if (err instanceof ConflictError)
				refusal = { id: role.id, line: roleHoldersLine(err.holders, err.holderNames) };
			throw err;
		}
	}
</script>

<ReasonConfirmDialog
	bind:open
	onOpenChange={handleOpenChange}
	title={`Delete role "${role?.name ?? ''}"?`}
	description="It disappears from your lists and can't be assigned. A role that people still hold can't be deleted."
	confirmLabel="Delete role"
	askReason={false}
	confirmText={role?.name ?? ''}
	messages={{
		failed: $_('reasonConfirm.deleteRole.failed'),
		forbidden: $_('reasonConfirm.deleteRole.forbidden'),
		notFound: $_('reasonConfirm.deleteRole.notFound'),
		conflict: $_('reasonConfirm.deleteRole.conflict')
	}}
	{onConfirm}
>
	{#snippet extra()}
		{#if held}<p class="body-sm text-muted-foreground">{held}</p>{/if}
	{/snippet}
</ReasonConfirmDialog>
