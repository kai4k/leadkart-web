<!-- src/lib/components/ui/drawer/Drawer.svelte -->
<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children: Snippet;
	};

	let { open = $bindable(false), onOpenChange, children }: Props = $props();
</script>

<BitsDialog.Root bind:open {onOpenChange}>
	{@render children()}
</BitsDialog.Root>
