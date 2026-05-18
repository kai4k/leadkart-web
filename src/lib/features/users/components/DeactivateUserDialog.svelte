<!-- src/lib/features/users/components/DeactivateUserDialog.svelte -->
<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth/view-models';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	let reason = $state('');
	let error = $state<string | null>(null);
	const isPending = $derived(users.status === 'mutating');

	async function onConfirm() {
		if (!user) return;
		error = null;
		try {
			await users.deactivate(user.membership_id, reason.trim());
			reason = '';
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to deactivate';
		}
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
				class="glass-input w-full rounded-md px-3 py-2 text-sm"
			></textarea>
		</label>
		{#if error}<Alert variant="danger">{error}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
