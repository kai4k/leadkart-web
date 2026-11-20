<script lang="ts">
	/** See `nested-page-header.ts`: page headers below this are section titles, not the `<h1>`. */
	import type { Snippet } from 'svelte';
	import { setNestedPageHeaders } from './nested-page-header.ts';

	let { children }: { children: Snippet } = $props();
	setNestedPageHeaders();
</script>

{@render children()}
