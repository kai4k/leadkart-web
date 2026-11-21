<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * One piece of a typed date: an editable segment (`role="spinbutton"`, day, month or year) or the literal separator.
	 * Presentational: `date-field-input` owns the state and the keys. An editable segment is 24 x 24 at least (WCAG 2.5.8;
	 * a two-digit day is narrower), and the 24 px comes from the segment itself, so the targets touch but never overlap.
	 * The literal is an ordinary inline character with a small inline padding: a placeholder letter ("mm", "yyyy") is wider
	 * than a digit, so a zero-width separator would collide with it. Digits are tabular, so a typed date does not jiggle.
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
			? 'inline-flex items-center px-1 text-muted-foreground select-none'
			: 'inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-placeholder:text-muted-foreground',
		className
	)}
	{...restProps}>{@render children?.()}</span
>
