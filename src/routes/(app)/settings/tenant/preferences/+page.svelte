<script lang="ts">
	import { Card } from '$ui';
	import TenantDisplayPreferencesForm from '$features/tenant/components/TenantDisplayPreferencesForm.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Display preferences</Card.Title>
		<Card.Description>
			Locale, time zone, date format, and currency control how data appears across the LeadKart UI
			and on outbound emails / invoices.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<TenantDisplayPreferencesForm tenant={data.tenant} form={form ?? undefined} />
	</Card.Content>
</Card.Root>
