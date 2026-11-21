<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * One piece of a typed date: an editable segment (`role="spinbutton"`, day, month or year) or the literal separator.
	 * Presentational: `date-field-input` owns the state and the keys. An editable segment is 24 x 24 at least (WCAG 2.5.8;
	 * a two-digit day is narrower), and the 24 px comes from the segment itself, so the targets touch but never overlap.
	 * The literal is zero-width and lets its glyph overflow into the empty sides of the neighbouring segments, so the date
	 * reads as compactly as a typed one.
	 */
	let {
		class: className,
		part,
		empty = false,
		children,
		...restProps
	}: HTMLAttributes<HTMLSpanElement> & {
		part: 'day' | 'month' | 'year' | 'literal';
		empty?: boolean;
	} = $props();
</script>

<span
	data-slot="date-field-segment"
	data-segment={part}
	data-placeholder={empty ? '' : undefined}
	class={cn(
		part === 'literal'
			? 'inline-flex w-0 items-center justify-center overflow-visible text-muted-foreground select-none'
			: 'inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-placeholder:text-muted-foreground',
		className
	)}
	{...restProps}>{@render children?.()}</span
>
