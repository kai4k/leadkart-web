<script lang="ts">
	import { Card } from '$ui';
	import TenantDisplayPreferencesForm from '$features/tenant/components/TenantDisplayPreferencesForm.svelte';
	import { tenant } from '$features/tenant/stores/tenant.svelte';
</script>

{#if tenant.current}
	<Card.Root>
		<Card.Header>
			<Card.Title>Display preferences</Card.Title>
			<Card.Description>
				Locale, time zone, date format, and currency control how data appears across the LeadKart UI
				and on outbound emails / invoices.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<TenantDisplayPreferencesForm tenant={tenant.current} />
		</Card.Content>
	</Card.Root>
{/if}
