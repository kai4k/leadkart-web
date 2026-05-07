<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { applyToDocument } from '$lib/stores/theme.svelte';

	let { children } = $props();

	onMount(() => {
		applyToDocument();
	});
</script>

{@render children()}
