<script lang="ts">
	import { Card } from '#lib/components/ui/index.ts';
	import { TenantContactForm } from '#lib/features/tenant/index.ts';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Contact</Card.Title>
		<Card.Description>
			Admin phone and postal address. Used on tax filings, drug-control submissions, and outbound
			platform notifications.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<TenantContactForm tenant={data.tenant} form={form ?? undefined} />
	</Card.Content>
</Card.Root>
