<script lang="ts">
	import { Label } from '#lib/components/ui/label/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import type { ComponentProps } from 'svelte';
	import FieldRequired from './field-required.svelte';

	let {
		ref = $bindable(null),
		class: className,
		required = false,
		children,
		...restProps
	}: ComponentProps<typeof Label> & {
		/** Draws the visible required mark; the control carries the matching `required` / `aria-required`. */
		required?: boolean;
	} = $props();
</script>

<Label
	bind:ref
	data-slot="field-label"
	class={cn(
		'has-data-checked:bg-primary-soft has-data-checked:border-primary-indicator dark:has-data-checked:border-primary-indicator dark:has-data-checked:bg-primary-soft gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-muted has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 *:data-[slot=field]:p-2.5 group/field-label peer/field-label flex w-fit',
		'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
		className
	)}
	{...restProps}
>
	{@render children?.()}
	{#if required}<FieldRequired />{/if}
</Label>
