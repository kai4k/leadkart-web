<script lang="ts">
	import { Card } from '$ui';
	import TenantProfileForm from '$features/tenant/components/TenantProfileForm.svelte';
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
			<Card.Title>Profile</Card.Title>
			<Card.Description>
				The legal entity name and the friendly display name shown across the LeadKart UI and on
				outbound communications.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<TenantProfileForm tenant={tenantData} {tenantId} />
		</Card.Content>
	</Card.Root>
{/if}
