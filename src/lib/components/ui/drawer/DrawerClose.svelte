<!-- src/lib/components/ui/drawer/DrawerClose.svelte -->
<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = { class?: string; children: Snippet };

	let { class: className = '', children }: Props = $props();
</script>

<BitsDialog.Close class={className}>
	{@render children()}
</BitsDialog.Close>
