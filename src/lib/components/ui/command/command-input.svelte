<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { Search } from '#lib/icons/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * LeadKart edit: no `input-group` (a registry dependency outside the plan's generated set). The
	 * generated wrapper's look, on the bits input: a search icon and the field, one row.
	 */
	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(''),
		...restProps
	}: CommandPrimitive.InputProps = $props();
</script>

<div
	data-slot="command-input-wrapper"
	class="border-border flex h-10 items-center gap-2 border-b px-3"
>
	<Search class="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
	<CommandPrimitive.Input
		bind:ref
		bind:value
		data-slot="command-input"
		class={cn(
			'placeholder:text-muted-foreground w-full bg-transparent text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{...restProps}
	/>
</div>
