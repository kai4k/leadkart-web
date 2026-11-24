<script lang="ts">
	import { page } from '$app/state';
	import { OrderDetail } from '#lib/features/orders/index.ts';

	const id = $derived(page.params.id ?? '');
</script>

<svelte:head><title>Order · LeadKart</title></svelte:head>

{#key id}
	<OrderDetail {id} />
{/key}
