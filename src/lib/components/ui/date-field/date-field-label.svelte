<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * The visible label of a date field; it names the segment group (`aria-labelledby`). Same look as `field/field-label`.
	 * Clicking it focuses the first segment (the caller's `onclick`).
	 */
	let { class: className, children, ...restProps }: HTMLAttributes<HTMLSpanElement> = $props();
</script>

<span
	data-slot="date-field-label"
	class={cn(
		'flex w-fit items-center gap-2 text-sm leading-snug font-medium select-none',
		className
	)}
	{...restProps}>{@render children?.()}</span
>
