<script lang="ts">
	import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
	import { setContext } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import type { ToggleVariants } from '../toggle';
	type SingleProps = Extract<ToggleGroupPrimitive.RootProps, { type?: 'single' }>;
	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(),
		variant = 'default',
		size = 'default',
		type: _type,
		...rest
	}: SingleProps & ToggleVariants = $props();

	setContext('toggle-group', { variant, size });
</script>

<ToggleGroupPrimitive.Root
	bind:ref
	bind:value
	type="single"
	data-slot="toggle-group"
	class={cn('inline-flex items-center justify-center gap-1', className)}
	{...rest}
/>
