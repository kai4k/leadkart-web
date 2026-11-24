<!-- src/lib/features/users/components/DeactivateUserDialog.svelte -->
<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';
	import { deactivateUserMutation } from '#lib/features/users/queries.ts';
	import type { UserDto } from '#lib/features/users/types.ts';
	import { displayName } from '#lib/features/auth/index.ts';
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
	description="Deactivated members can't sign in until reactivated. All open sessions are revoked. Deactivated members are not shown in the team list."
	confirmLabel="Deactivate"
	reasonLabel="Reason (required, audited)"
	messages={{
		failed: $_('reasonConfirm.deactivateUser.failed'),
		forbidden: $_('reasonConfirm.deactivateUser.forbidden'),
		notFound: $_('reasonConfirm.deactivateUser.notFound'),
		conflict: $_('reasonConfirm.deactivateUser.conflict')
	}}
	{onConfirm}
/>
