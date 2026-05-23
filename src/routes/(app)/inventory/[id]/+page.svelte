<script lang="ts">
	import { page } from '$app/state';
	import ProductDetail from '$features/inventory/components/ProductDetail.svelte';

	const id = $derived(page.params.id ?? '');
</script>

<svelte:head><title>Product · LeadKart</title></svelte:head>

<ProductDetail {id} />
