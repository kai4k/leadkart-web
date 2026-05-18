<script lang="ts">
	import { Card } from '$ui';
	import TenantStatutoryForm from '$features/tenant/components/TenantStatutoryForm.svelte';
	import { tenantSelfQuery } from '$features/tenant/queries';
	import { myCapabilitiesQuery } from '$features/auth/queries';

	const capsQuery = myCapabilitiesQuery();
	const tenantId = $derived(capsQuery.data?.tenant_id ?? '');
	const tenantQuery = $derived(tenantSelfQuery(tenantId));
	const tenantData = $derived(tenantQuery.data ?? null);
</script>

{#if tenantData}
	<Card.Root>
		<Card.Header>
			<Card.Title>Statutory IDs</Card.Title>
			<Card.Description>
				GSTIN, PAN, and drug licence number used on tax filings and regulatory submissions.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<TenantStatutoryForm tenant={tenantData} {tenantId} />
		</Card.Content>
	</Card.Root>
{/if}
