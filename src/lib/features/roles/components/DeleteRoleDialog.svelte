<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { deleteRoleMutation } from '$features/roles/queries';
	import type { RoleDto } from '$features/roles/types';

	type Props = { open: boolean; role: RoleDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), role, onOpenChange }: Props = $props();

	let confirmName = $state('');
	let error = $state<string | null>(null);

	const mutation = deleteRoleMutation();
	const isPending = $derived(mutation.isPending);
	const canConfirm = $derived(role !== null && confirmName === role.name);

	async function onConfirm() {
		if (!role || !canConfirm) return;
		error = null;
		mutation.mutate(role.id, {
			onSuccess: () => {
				confirmName = '';
				onOpenChange(false);
			},
			onError: (err) => {
				error = err instanceof Error ? err.message : 'Failed to delete role';
			}
		});
	}
</script>

<ConfirmDialog
	bind:open
	title="Delete {role?.name ?? 'role'}"
	description="Removes the role and unassigns it from all members. Users keep their personal permission overrides. This is permanent."
	confirmLabel="Delete role"
	variant="danger"
	loading={isPending}
	{onOpenChange}
	{onConfirm}
>
	{#snippet body()}
		<label class="stack stack-tight">
			<span class="label"
				>Type <code class="rounded bg-[var(--color-bg-muted)] px-1">{role?.name ?? ''}</code> to confirm</span
			>
			<input bind:value={confirmName} class="glass-input rounded-md px-3 py-2 text-sm" />
		</label>
		{#if error}<Alert variant="danger">{error}</Alert>{/if}
		{#if !canConfirm && confirmName.length > 0}
			<p class="caption text-[var(--color-warning-900)]">Name doesn't match.</p>
		{/if}
	{/snippet}
</ConfirmDialog>
