<script lang="ts">
	import { Card } from '$ui';
	import TenantDisplayPreferencesForm from '$features/tenant/components/TenantDisplayPreferencesForm.svelte';
	import { tenantSelfQuery } from '$features/tenant/queries';
	import { session } from '$features/auth/stores/session.svelte';

	const tenantId = $derived(session.principal?.tenantId ?? '');
	const tenantQuery = $derived(tenantSelfQuery(tenantId));
	const tenantData = $derived(tenantQuery.data ?? null);
</script>

{#if tenantData}
	<Card.Root>
		<Card.Header>
			<Card.Title>Display preferences</Card.Title>
			<Card.Description>
				Locale, time zone, date format, and currency control how data appears across the LeadKart UI
				and on outbound emails / invoices.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<TenantDisplayPreferencesForm tenant={tenantData} {tenantId} />
		</Card.Content>
	</Card.Root>
{/if}
