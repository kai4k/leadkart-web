<script lang="ts">
	import { Card } from '$ui';
	import TenantStatutoryForm from '$features/tenant/components/TenantStatutoryForm.svelte';
	import { tenant } from '$features/tenant/stores/tenant.svelte';
</script>

{#if tenant.current}
	<Card.Root>
		<Card.Header>
			<Card.Title>Statutory IDs</Card.Title>
			<Card.Description>
				GSTIN, PAN, and drug licence number used on tax filings and regulatory submissions.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<TenantStatutoryForm tenant={tenant.current} />
		</Card.Content>
	</Card.Root>
{/if}
