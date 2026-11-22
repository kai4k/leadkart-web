<script lang="ts">
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';
	import { suspendTenantMutation } from '../queries';
	import type { TenantDto } from '../types';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = {
		open: boolean;
		tenant: TenantDto | null;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	const suspendMutation = suspendTenantMutation();
	// The component outlives the dialog: detach the observer when it opens or closes (a late failure then toasts).
	useResetOnChange(() => open, suspendMutation);

	async function onConfirm(reason: string) {
		if (!tenant) return;
		await suspendMutation.mutateAsync({ id: tenant.id, reason });
	}
</script>

<ReasonConfirmDialog
	bind:open
	{onOpenChange}
	title="Suspend {tenant?.display_name ?? 'tenant'}"
	description="All tenant users will be unable to sign in until the tenant is reactivated. Active sessions are revoked server-side."
	confirmLabel="Suspend tenant"
	variant="warning"
	reasonLabel="Reason (required, audited)"
	noun="tenant"
	conflict="This tenant is already suspended."
	{onConfirm}
/>
