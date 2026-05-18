<script lang="ts">
	import { Card } from '$ui';
	import TenantContactForm from '$features/tenant/components/TenantContactForm.svelte';
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
			<Card.Title>Contact</Card.Title>
			<Card.Description>
				Admin phone and postal address. Used on tax filings, drug-control submissions, and outbound
				platform notifications.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<TenantContactForm tenant={tenantData} {tenantId} />
		</Card.Content>
	</Card.Root>
{/if}
