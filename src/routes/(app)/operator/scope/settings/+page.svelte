<script lang="ts">
	import { createDialogState } from '#lib/hooks/index.ts';
	import { plainTitle } from '#lib/utils/page-title.ts';
	import {
		TenantActionPanel,
		SuspendDialog,
		type TenantDto
	} from '#lib/features/operator/tenants/index.ts';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const suspendDialog = createDialogState<TenantDto>();

	const tenant = $derived(data.tenant);
</script>

<svelte:head><title>Settings · {plainTitle(tenant.display_name)} · LeadKart</title></svelte:head>

<TenantActionPanel {tenant} onSuspend={suspendDialog.show} />

<SuspendDialog
	bind:open={suspendDialog.open}
	tenant={suspendDialog.target}
	onOpenChange={suspendDialog.onOpenChange}
/>
