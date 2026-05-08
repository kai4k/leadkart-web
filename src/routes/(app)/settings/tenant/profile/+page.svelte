<script lang="ts">
	import { Card } from '$ui';
	import TenantProfileForm from '$features/tenant/components/TenantProfileForm.svelte';
	import { tenant } from '$features/tenant/stores/tenant.svelte';

	/**
	 * /settings/tenant/profile — Profile section. The parent layout
	 * guards on `tenant.current` before rendering children, but the
	 * `{#if}` here keeps TypeScript narrowing in scope (the compiler
	 * can't follow guard logic across component boundaries).
	 */
</script>

{#if tenant.current}
	<Card.Root>
		<Card.Header>
			<Card.Title>Profile</Card.Title>
			<Card.Description>
				The legal entity name and the friendly display name shown across the LeadKart UI and on
				outbound communications.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<TenantProfileForm tenant={tenant.current} />
		</Card.Content>
	</Card.Root>
{/if}
