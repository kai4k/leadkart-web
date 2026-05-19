<!-- src/lib/components/ui/drawer/DrawerHeader.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	let { class: className = '', children }: { class?: string; children: Snippet } = $props();
</script>

<header
	class={cn('border-border flex items-start justify-between gap-3 border-b px-5 py-4', className)}
>
	{@render children()}
</header>
