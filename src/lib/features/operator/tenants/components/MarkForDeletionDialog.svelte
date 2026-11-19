<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { markForDeletionMutation } from '../queries';
	import type { TenantDto } from '../types';
	import { ValidationError, describeError } from '$api/errors';

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
	const markMutation = markForDeletionMutation();
	const isPending = $derived(markMutation.isPending);

	async function onConfirm() {
		if (!tenant) return;
		reasonError = null;
		bannerError = null;
		markMutation.mutate(
			{ id: tenant.id, reason: reason.trim() },
			{
				onSuccess: () => {
					reason = '';
					onOpenChange(false);
				},
				onError: (err: unknown) => {
					if (err instanceof ValidationError) {
						reasonError = err.fields.reason ?? null;
						bannerError = reasonError ? null : 'The server rejected this request.';
					} else {
						bannerError = describeError(err, {
							fallback: 'Failed to mark for deletion. Please try again.',
							status: {
								403: "You don't have permission to mark tenants for deletion.",
								404: 'This tenant was deleted or moved.',
								409: 'This tenant is already marked for deletion.'
							}
						});
					}
				}
			}
		);
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
				aria-invalid={reasonError ? 'true' : undefined}
				class="bg-bg-elevated border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
			></textarea>
			{#if reasonError}<span class="body-sm text-danger-700">{reasonError}</span>{/if}
		</label>
		<Alert variant="warning">Reversible for 30 days via Restore.</Alert>
		{#if bannerError}<Alert variant="danger">{bannerError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
