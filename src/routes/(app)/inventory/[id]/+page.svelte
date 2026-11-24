<script lang="ts">
	import { page } from '$app/state';
	import { ProductDetail } from '#lib/features/inventory/index.ts';

	const id = $derived(page.params.id ?? '');
</script>

<svelte:head><title>Product · LeadKart</title></svelte:head>

<ProductDetail {id} />
