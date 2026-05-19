<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { toast } from '$ui';
	import { suspendTenantMutation } from '$features/operator/tenants/queries';
	import type { TenantDto } from '$features/operator/tenants/types';

	type Props = { open: boolean; tenant: TenantDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	let reason = $state('');
	let formError = $state<string | null>(null);

	// TanStack Query v6 (Svelte 5): result is Svelte 5 reactive state, accessed directly.
	const suspendMutation = suspendTenantMutation();
	const isPending = $derived(suspendMutation.isPending);

	async function onConfirm() {
		if (!tenant) return;
		formError = null;
		suspendMutation.mutate(
			{ id: tenant.id, reason: reason.trim() },
			{
				onSuccess: () => {
					toast('success', `${tenant!.display_name} suspended`);
					reason = '';
					onOpenChange(false);
				},
				onError: (err: unknown) => {
					formError = err instanceof Error ? err.message : 'Failed to suspend';
				}
			}
		);
	}
</script>

<ConfirmDialog
	bind:open
	title="Suspend {tenant?.display_name ?? 'tenant'}"
	description="All tenant users will be unable to sign in until the tenant is reactivated. Active sessions are revoked server-side."
	confirmLabel="Suspend tenant"
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
		{#if formError}<Alert variant="danger">{formError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
