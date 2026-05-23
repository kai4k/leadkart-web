<script lang="ts">
	import { page } from '$app/state';
	import OrderDetail from '$features/orders/components/OrderDetail.svelte';

	const id = $derived(page.params.id ?? '');
</script>

<svelte:head><title>Order · LeadKart</title></svelte:head>

<OrderDetail {id} />
