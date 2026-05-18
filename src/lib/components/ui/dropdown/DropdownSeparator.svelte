<!-- src/lib/components/ui/dropdown/DropdownSeparator.svelte -->
<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
	};

	let { class: className = '' }: Props = $props();
</script>

<BitsMenu.Separator class={cn('-mx-1 my-1 h-px bg-[var(--color-border)]', className)} />
