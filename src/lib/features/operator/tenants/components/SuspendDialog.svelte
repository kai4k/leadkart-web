<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { suspendTenantMutation } from '../queries';
	import type { TenantDto } from '../types';
	import { ValidationError, describeError } from '$api/errors';

	type Props = {
		open: boolean;
		tenant: TenantDto | null;
		onOpenChange: (open: boolean) => void;
		/** Inside the operator scope tree the tenant is server-loaded: reload it after the change. */
		reloadPageData?: boolean;
	};
	let { open = $bindable(false), tenant, onOpenChange, reloadPageData = false }: Props = $props();

	let reason = $state('');
	let reasonError = $state<string | null>(null);
	let bannerError = $state<string | null>(null);

	// TanStack Query v6 (Svelte 5): result is Svelte 5 reactive state, accessed directly.
	const suspendMutation = suspendTenantMutation({
		get reloadPageData() {
			return reloadPageData;
		}
	});
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
					if (err instanceof ValidationError) {
						reasonError = err.fields.reason ?? null;
						bannerError = reasonError ? null : 'The server rejected this request.';
					} else {
						bannerError = describeError(err, {
							fallback: 'Failed to suspend. Please try again.',
							status: {
								403: "You don't have permission to suspend tenants.",
								404: 'This tenant was deleted or moved.',
								409: 'This tenant is already suspended.'
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
		{#if bannerError}<Alert variant="danger">{bannerError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
