<script lang="ts">
	import * as FormPrimitive from 'formsnap';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: FormPrimitive.LabelProps = $props();
</script>

<FormPrimitive.Label
	bind:ref
	data-slot="form-label"
	class={cn(
		'text-sm font-medium leading-none text-fg data-[fs-error]:text-danger-700',
		className
	)}
	{...rest}
>
	{@render children?.()}
</FormPrimitive.Label>
