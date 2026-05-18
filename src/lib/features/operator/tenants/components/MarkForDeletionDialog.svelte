<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	type Props = { open: boolean; tenant: TenantDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	let reason = $state('');
	let error = $state<string | null>(null);
	const isPending = $derived(operatorTenants.status === 'mutating');

	async function onConfirm() {
		if (!tenant) return;
		error = null;
		try {
			await operatorTenants.markForDeletion(tenant.id, reason.trim());
			reason = '';
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to mark for deletion';
		}
	}
</script>

<ConfirmDialog
	bind:open
	title="Mark {tenant?.display_name ?? 'tenant'} for deletion"
	description="Schedules the tenant for permanent deletion. Reversible via Restore for 30 days; after that, the tenant is anonymised and unrecoverable."
	confirmLabel="Mark for deletion"
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
		<Alert variant="warning">Reversible for 30 days via Restore.</Alert>
		{#if error}<Alert variant="danger">{error}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
