<!-- src/lib/components/ui/dropdown/DropdownTrigger.svelte -->
<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	};

	let { class: className = '', children, ...rest }: Props = $props();
</script>

<BitsMenu.Trigger class={className} {...rest}>
	{@render children()}
</BitsMenu.Trigger>
