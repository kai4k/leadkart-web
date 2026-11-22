<!-- src/lib/features/users/components/DeactivateUserDialog.svelte -->
<script lang="ts">
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';
	import { deactivateUserMutation } from '$features/users/queries';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	const mutation = deactivateUserMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);

	async function onConfirm(reason: string) {
		if (!user) return;
		await mutation.mutateAsync({ id: user.membership_id, reason });
	}
</script>

<ReasonConfirmDialog
	bind:open
	{onOpenChange}
	title="Deactivate {user ? displayName(user) : 'user'}"
	description="Deactivated users can't sign in until reactivated. All open sessions are revoked. This is reversible."
	confirmLabel="Deactivate"
	reasonLabel="Reason (required, audited)"
	noun="user"
	conflict="This user is already deactivated."
	{onConfirm}
/>
