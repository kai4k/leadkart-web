<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';
	import { deleteRoleMutation } from '#lib/features/roles/queries.ts';
	import type { RoleDto } from '#lib/features/roles/types.ts';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = { open: boolean; role: RoleDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), role, onOpenChange }: Props = $props();

	const mutation = deleteRoleMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);

	async function onConfirm() {
		if (!role) return;
		await mutation.mutateAsync(role.id);
	}
</script>

<ReasonConfirmDialog
	bind:open
	{onOpenChange}
	title={`Delete role "${role?.name ?? ''}"?`}
	description="It disappears from your lists and can't be assigned. A role that people still have can't be deleted: take it off them first."
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
/>
