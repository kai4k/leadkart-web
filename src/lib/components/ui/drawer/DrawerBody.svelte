<!-- src/lib/components/ui/drawer/DrawerBody.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	let { class: className = '', children }: { class?: string; children: Snippet } = $props();
</script>

<div class={cn('flex-1 overflow-y-auto px-5 py-5', className)}>
	{@render children()}
</div>
