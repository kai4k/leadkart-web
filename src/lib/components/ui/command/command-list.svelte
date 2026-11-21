<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { _ } from 'svelte-i18n';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * LeadKart edit: the listbox is the bits Viewport, not the outer List element. The input's `aria-controls` is bits'
	 * viewport id (a combobox must name the popup it controls, and nothing sets it without a Viewport); the viewport is
	 * therefore the `role="listbox"` the options sit in, and the List element is only the scroll box around it. A caller's `id` goes on the listbox (Combobox's `aria-controls`).
	 */
	let {
		ref = $bindable(null),
		class: className,
		'aria-label': ariaLabel,
		id,
		children,
		...restProps
	}: CommandPrimitive.ListProps = $props();
</script>

<CommandPrimitive.List
	bind:ref
	data-slot="command-list"
	class={cn(
		'no-scrollbar max-h-72 scroll-py-1 outline-none overflow-x-hidden overflow-y-auto',
		className
	)}
	{...restProps}
>
	{#snippet child({ props })}
		<div {...props} role="presentation" aria-label={undefined}>
			<CommandPrimitive.Viewport
				{id}
				data-slot="command-listbox"
				role="listbox"
				aria-label={ariaLabel ?? $_('common.commandPalette.results')}
			>
				{@render children?.()}
			</CommandPrimitive.Viewport>
		</div>
	{/snippet}
</CommandPrimitive.List>
