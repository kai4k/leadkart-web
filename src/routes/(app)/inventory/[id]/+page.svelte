<script lang="ts">
	import { page } from '$app/state';
	import ItemDetail from '$features/inventory/components/ItemDetail.svelte';

	const id = $derived(page.params.id ?? '');
</script>

<svelte:head><title>Item · LeadKart</title></svelte:head>

<ItemDetail {id} />
