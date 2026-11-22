<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';
	import { deleteRoleMutation } from '$features/roles/queries';
	import type { RoleDto } from '$features/roles/types';
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
	title="Delete {role?.name ?? 'role'}"
	description="Removes the role and unassigns it from all members. Users keep their personal permission overrides. This is permanent."
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
