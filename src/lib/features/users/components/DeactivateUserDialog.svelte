<!-- src/lib/features/users/components/DeactivateUserDialog.svelte -->
<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { deactivateUserMutation } from '$features/users/queries';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth/view-models';
	import {
		ValidationError,
		ConflictError,
		AuthError,
		NotFoundError,
		NetworkError
	} from '$api/errors';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	let reason = $state('');
	let reasonError = $state<string | null>(null);
	let bannerError = $state<string | null>(null);

	const mutation = deactivateUserMutation();
	const isPending = $derived(mutation.isPending);

	async function onConfirm() {
		if (!user) return;
		reasonError = null;
		bannerError = null;
		mutation.mutate(
			{ id: user.membership_id, reason: reason.trim() },
			{
				onSuccess: () => {
					reason = '';
					onOpenChange(false);
				},
				onError: (err) => {
					if (err instanceof ValidationError) {
						reasonError = err.fields.reason ?? null;
						bannerError = reasonError ? null : 'The server rejected this request.';
					} else if (err instanceof ConflictError) {
						bannerError = err.detail || 'This user is already deactivated.';
					} else if (err instanceof AuthError) {
						bannerError =
							err.status === 403
								? "You don't have permission to deactivate this user."
								: 'Your session expired. Sign in again.';
					} else if (err instanceof NotFoundError) {
						bannerError = 'This user was deleted or moved.';
					} else if (err instanceof NetworkError) {
						bannerError = 'Check your network connection and try again.';
					} else {
						bannerError = 'Failed to deactivate. Please try again.';
					}
				}
			}
		);
	}
</script>

<ConfirmDialog
	bind:open
	title="Deactivate {user ? displayName(user) : 'user'}"
	description="Deactivated users can't sign in until reactivated. All open sessions are revoked. This is reversible."
	confirmLabel="Deactivate"
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
				aria-invalid={reasonError ? 'true' : undefined}
				class="bg-bg-elevated border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
			></textarea>
			{#if reasonError}<span class="body-sm text-danger-700">{reasonError}</span>{/if}
		</label>
		{#if bannerError}<Alert variant="danger">{bannerError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
