<!-- src/lib/components/ui/dropdown/Dropdown.svelte -->
<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children: Snippet;
	};

	let { open = $bindable(false), onOpenChange, children }: Props = $props();
</script>

<BitsMenu.Root bind:open {onOpenChange}>
	{@render children()}
</BitsMenu.Root>
