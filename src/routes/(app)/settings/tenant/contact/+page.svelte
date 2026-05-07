<script lang="ts">
	import { Card } from '$ui';
	import TenantContactForm from '$features/tenant/components/TenantContactForm.svelte';
	import { tenant } from '$features/tenant/stores/tenant.svelte';
</script>

{#if tenant.current}
	<Card.Root>
		<Card.Header>
			<Card.Title>Contact</Card.Title>
			<Card.Description>
				Admin phone and postal address. Used on tax filings, drug-control submissions, and outbound
				platform notifications.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<TenantContactForm tenant={tenant.current} />
		</Card.Content>
	</Card.Root>
{/if}
