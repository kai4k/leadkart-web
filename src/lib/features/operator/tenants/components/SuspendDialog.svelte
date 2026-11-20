<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { suspendTenantMutation } from '../queries';
	import type { TenantDto } from '../types';
	import { describeReasonError } from '$api/errors';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = {
		open: boolean;
		tenant: TenantDto | null;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	let reason = $state('');
	let reasonError = $state<string | null>(null);
	let bannerError = $state<string | null>(null);

	// TanStack Query v6 (Svelte 5): result is Svelte 5 reactive state, accessed directly.
	const suspendMutation = suspendTenantMutation();
	// The component outlives the dialog: detach the observer when it opens or closes (a late failure then toasts).
	useResetOnChange(() => open, suspendMutation);
	const isPending = $derived(suspendMutation.isPending);

	async function onConfirm() {
		if (!tenant) return;
		reasonError = null;
		bannerError = null;
		suspendMutation.mutate(
			{ id: tenant.id, reason: reason.trim() },
			{
				onSuccess: () => {
					reason = '';
					onOpenChange(false);
				},
				onError: (err: unknown) => {
					({ reasonError, banner: bannerError } = describeReasonError(err, {
						fallback: 'Failed to suspend. Please try again.',
						status: {
							403: "You don't have permission to suspend tenants.",
							404: 'This tenant was deleted or moved.',
							409: 'This tenant is already suspended.'
						}
					}));
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
	variant="warning"
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
		{#if bannerError}<Alert variant="destructive">{bannerError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
