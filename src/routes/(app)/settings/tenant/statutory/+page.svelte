<script lang="ts">
	import { Card } from '$ui';
	import TenantStatutoryForm from '$features/tenant/components/TenantStatutoryForm.svelte';
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
