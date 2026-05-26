<script lang="ts">
	import TenantSecurityForm from '$features/tenant/components/TenantSecurityForm.svelte';
	import { tenantSelfQuery } from '$features/tenant/queries';
	import { myCapabilitiesQuery } from '$features/auth/queries';

	const capsQuery = myCapabilitiesQuery();
	const tenantId = $derived(capsQuery.data?.tenant_id ?? '');
	const tenantQuery = $derived(tenantSelfQuery(tenantId));
	const tenantData = $derived(tenantQuery.data ?? null);
</script>

{#if tenantData}
	<TenantSecurityForm tenant={tenantData} {tenantId} />
{/if}
