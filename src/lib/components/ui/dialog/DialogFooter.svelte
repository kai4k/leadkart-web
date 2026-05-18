<!-- src/lib/components/ui/dialog/DialogFooter.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	let { class: className = '', children }: { class?: string; children: Snippet } = $props();
</script>

<footer
	class={cn('border-border flex items-center justify-end gap-2 border-t px-5 py-4', className)}
>
	{@render children()}
</footer>
