<script lang="ts">
	import { Card } from '$ui';
	import TenantStatutoryForm from '$features/tenant/components/TenantStatutoryForm.svelte';
	import { tenantSelfQuery } from '$features/tenant/queries';
	import { session } from '$features/auth/stores/session.svelte';

	const tenantId = $derived(session.principal?.tenantId ?? '');
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
