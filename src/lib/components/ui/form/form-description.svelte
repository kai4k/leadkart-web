<script lang="ts">
	import * as FormPrimitive from 'formsnap';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: FormPrimitive.DescriptionProps = $props();
</script>

<FormPrimitive.Description
	bind:ref
	data-slot="form-description"
	class={cn('text-sm text-fg-muted', className)}
	{...rest}
>
	{@render children?.()}
</FormPrimitive.Description>
