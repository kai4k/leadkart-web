<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * One piece of a typed date: an editable segment (a real text `<input inputmode="numeric">` with
	 * `role="spinbutton"`: day, month or year) or the literal separator. Presentational: `date-field-input` owns the state,
	 * the keys and the reading back of what the browser put into the input.
	 *
	 * An editable segment is 24 x 24 at least (WCAG 2.5.8) and its width is in `ch` (digits are tabular), so a typed date
	 * never jiggles and a placeholder (`dd`, `mm`, `yyyy`) fits. The literal is an ordinary inline character with a small
	 * inline padding.
	 */
	let {
		class: className,
		part,
		value = '',
		children,
		...restProps
	}: Omit<HTMLInputAttributes, 'value' | 'children'> & {
		part: 'day' | 'month' | 'year' | 'literal';
		value?: string;
		children?: import('svelte').Snippet;
	} = $props();
</script>

{#if part === 'literal'}
	<span
		data-slot="date-field-segment"
		data-segment="literal"
		class={cn('inline-flex items-center px-1 text-muted-foreground select-none', className)}
		aria-hidden="true">{@render children?.()}</span
	>
{:else}
	<input
		type="text"
		inputmode="numeric"
		autocomplete="off"
		pattern="[0-9]*"
		data-slot="date-field-segment"
		data-segment={part}
		{value}
		class={cn(
			'inline-block min-h-6 min-w-6 rounded-sm bg-transparent p-0 text-center tabular-nums outline-none placeholder:text-muted-foreground focus:bg-accent focus:text-accent-foreground',
			part === 'year' ? 'w-[5ch]' : 'w-[3ch]',
			className
		)}
		{...restProps}
	/>
{/if}
