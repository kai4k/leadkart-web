<script lang="ts">
	import { Alert, Spinner } from '$ui';
	import { tenantBySlugQuery } from '$features/operator/tenants/queries';
	import TenantActionPanel from '$features/operator/tenants/components/TenantActionPanel.svelte';
	import SuspendDialog from '$features/operator/tenants/components/SuspendDialog.svelte';
	import MarkForDeletionDialog from '$features/operator/tenants/components/MarkForDeletionDialog.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	let { data } = $props();

	let suspendOpen = $state(false);
	let markOpen = $state(false);
	let target = $state<TenantDto | null>(null);

	const slug = $derived(data.slug);
	const query = $derived(tenantBySlugQuery(slug));
	const tenant = $derived(query.data ?? null);

	function onAction(action: 'suspend' | 'mark', t: TenantDto) {
		target = t;
		if (action === 'suspend') suspendOpen = true;
		else markOpen = true;
	}
</script>

<svelte:head><title>Settings · LeadKart</title></svelte:head>

{#if query.isPending}
	<div class="flex justify-center py-8"><Spinner size={28} /></div>
{:else if query.isError || !tenant}
	<Alert variant="warning" title="Tenant not found">Could not load tenant context.</Alert>
{:else}
	<TenantActionPanel {tenant} {onAction} />
{/if}

<SuspendDialog bind:open={suspendOpen} tenant={target} onOpenChange={(o) => (suspendOpen = o)} />
<MarkForDeletionDialog bind:open={markOpen} tenant={target} onOpenChange={(o) => (markOpen = o)} />
