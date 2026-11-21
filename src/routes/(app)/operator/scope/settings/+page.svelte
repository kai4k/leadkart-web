<script lang="ts">
	import { createDialogState } from '#lib/hooks/index.ts';
	import { plainTitle } from '#lib/utils/page-title.ts';
	import {
		TenantActionPanel,
		SuspendDialog,
		MarkForDeletionDialog,
		type TenantDto
	} from '$features/operator/tenants';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const suspendDialog = createDialogState<TenantDto>();
	const markDialog = createDialogState<TenantDto>();

	const tenant = $derived(data.tenant);

	function onAction(action: 'suspend' | 'mark', t: TenantDto) {
		if (action === 'suspend') suspendDialog.show(t);
		else markDialog.show(t);
	}
</script>

<svelte:head><title>Settings · {plainTitle(tenant.display_name)} · LeadKart</title></svelte:head>

<TenantActionPanel {tenant} {onAction} />

<SuspendDialog
	bind:open={suspendDialog.open}
	tenant={suspendDialog.target}
	onOpenChange={suspendDialog.onOpenChange}
/>
<MarkForDeletionDialog
	bind:open={markDialog.open}
	tenant={markDialog.target}
	onOpenChange={markDialog.onOpenChange}
/>
