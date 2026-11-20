<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { deleteRoleMutation } from '$features/roles/queries';
	import type { RoleDto } from '$features/roles/types';
	import { describeError } from '$api/errors';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = { open: boolean; role: RoleDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), role, onOpenChange }: Props = $props();

	let confirmName = $state('');
	let bannerError = $state<string | null>(null);

	const mutation = deleteRoleMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);
	const isPending = $derived(mutation.isPending);
	const canConfirm = $derived(role !== null && confirmName === role.name);

	async function onConfirm() {
		if (!role || !canConfirm) return;
		bannerError = null;
		mutation.mutate(role.id, {
			onSuccess: () => {
				confirmName = '';
				onOpenChange(false);
			},
			onError: (err) => {
				bannerError = describeError(err, {
					fallback: 'Failed to delete role. Please try again.',
					status: {
						403: "You don't have permission to delete roles.",
						404: 'This role was already deleted.',
						409: 'This role is still assigned to users — revoke it everywhere first.'
					}
				});
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
				>Type <code class="bg-bg-muted rounded px-1">{role?.name ?? ''}</code> to confirm</span
			>
			<input
				bind:value={confirmName}
				class="bg-bg-elevated border border-border rounded-md rounded-md px-3 py-2 text-sm"
			/>
		</label>
		{#if bannerError}<Alert variant="destructive">{bannerError}</Alert>{/if}
		{#if !canConfirm && confirmName.length > 0}
			<p class="caption text-warning-900">Name doesn't match.</p>
		{/if}
	{/snippet}
</ConfirmDialog>
