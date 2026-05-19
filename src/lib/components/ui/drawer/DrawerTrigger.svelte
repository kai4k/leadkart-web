<!-- src/lib/components/ui/drawer/DrawerTrigger.svelte -->
<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	};

	let { class: className = '', children, ...rest }: Props = $props();
</script>

<BitsDialog.Trigger class={className} {...rest}>
	{@render children()}
</BitsDialog.Trigger>
