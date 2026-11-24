<script lang="ts">
	import { Card } from '#lib/components/ui/index.ts';
	import { TenantProfileForm } from '#lib/features/tenant/index.ts';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Profile</Card.Title>
		<Card.Description>
			The legal entity name and the friendly display name shown across the LeadKart UI and on
			outbound communications.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<TenantProfileForm tenant={data.tenant} form={form ?? undefined} />
	</Card.Content>
</Card.Root>
