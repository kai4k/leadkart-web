<script lang="ts">
	import {
		TenantActionPanel,
		SuspendDialog,
		MarkForDeletionDialog,
		type TenantDto
	} from '$features/operator/tenants';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	let suspendOpen = $state(false);
	let markOpen = $state(false);
	let target = $state<TenantDto | null>(null);

	const tenant = $derived(data.tenant);

	function onAction(action: 'suspend' | 'mark', t: TenantDto) {
		target = t;
		if (action === 'suspend') suspendOpen = true;
		else markOpen = true;
	}
</script>

<svelte:head><title>Settings · {tenant.display_name} · LeadKart</title></svelte:head>

<TenantActionPanel {tenant} {onAction} reloadPageData />

<SuspendDialog
	bind:open={suspendOpen}
	tenant={target}
	onOpenChange={(o) => (suspendOpen = o)}
	reloadPageData
/>
<MarkForDeletionDialog
	bind:open={markOpen}
	tenant={target}
	onOpenChange={(o) => (markOpen = o)}
	reloadPageData
/>
