<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { deleteRoleMutation } from '$features/roles/queries';
	import type { RoleDto } from '$features/roles/types';
	import {
		ValidationError,
		ConflictError,
		AuthError,
		NotFoundError,
		NetworkError
	} from '$api/errors';

	type Props = { open: boolean; role: RoleDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), role, onOpenChange }: Props = $props();

	let confirmName = $state('');
	let bannerError = $state<string | null>(null);

	const mutation = deleteRoleMutation();
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
				if (err instanceof ValidationError) {
					bannerError = 'The server rejected the delete request.';
				} else if (err instanceof ConflictError) {
					bannerError =
						err.detail || 'This role is still assigned to users — revoke it everywhere first.';
				} else if (err instanceof AuthError) {
					bannerError =
						err.status === 403
							? "You don't have permission to delete roles."
							: 'Your session expired. Sign in again.';
				} else if (err instanceof NotFoundError) {
					bannerError = 'This role was already deleted.';
				} else if (err instanceof NetworkError) {
					bannerError = 'Check your network connection and try again.';
				} else {
					bannerError = 'Failed to delete role. Please try again.';
				}
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
		{#if bannerError}<Alert variant="danger">{bannerError}</Alert>{/if}
		{#if !canConfirm && confirmName.length > 0}
			<p class="caption text-warning-900">Name doesn't match.</p>
		{/if}
	{/snippet}
</ConfirmDialog>
