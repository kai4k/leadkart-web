<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';
	import { Alert } from '$ui';
	import { markForDeletionMutation } from '../queries';
	import type { TenantDto } from '../types';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = {
		open: boolean;
		tenant: TenantDto | null;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	const markMutation = markForDeletionMutation();
	// The component outlives the dialog: detach the observer when it opens or closes (a late failure then toasts).
	useResetOnChange(() => open, markMutation);

	async function onConfirm(reason: string) {
		if (!tenant) return;
		await markMutation.mutateAsync({ id: tenant.id, reason });
	}
</script>

<ReasonConfirmDialog
	bind:open
	{onOpenChange}
	title="Mark {tenant?.display_name ?? 'tenant'} for deletion"
	description="Schedules the tenant for permanent deletion. Reversible via Restore for 30 days; after that, the tenant is anonymised and unrecoverable."
	confirmLabel="Mark for deletion"
	reasonLabel="Reason (required, audited)"
	confirmText={tenant?.slug ?? ''}
	messages={{
		failed: $_('reasonConfirm.markForDeletion.failed'),
		forbidden: $_('reasonConfirm.markForDeletion.forbidden'),
		notFound: $_('reasonConfirm.markForDeletion.notFound'),
		conflict: $_('reasonConfirm.markForDeletion.conflict')
	}}
	{onConfirm}
>
	{#snippet extra()}
		<Alert variant="warning">Reversible for 30 days via Restore.</Alert>
	{/snippet}
</ReasonConfirmDialog>
