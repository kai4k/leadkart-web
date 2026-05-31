<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	type Props = HTMLAttributes<HTMLSpanElement> & {
		size?: number;
	};
	let { size = 16, class: className = '', ...rest }: Props = $props();
</script>

<span
	role="status"
	aria-label="Loading"
	style="width: {size}px; height: {size}px;"
	class={cn(
		'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
		className
	)}
	{...rest}
></span>
