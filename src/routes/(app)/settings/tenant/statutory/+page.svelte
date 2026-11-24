<script lang="ts">
	import { Card } from '#lib/components/ui/index.ts';
	import { TenantStatutoryForm } from '#lib/features/tenant/index.ts';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Statutory IDs</Card.Title>
		<Card.Description>
			GSTIN, PAN, and drug licence number used on tax filings and regulatory submissions.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<TenantStatutoryForm tenant={data.tenant} form={form ?? undefined} />
	</Card.Content>
</Card.Root>
