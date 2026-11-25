<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import {
		buttonVariants,
		type ButtonVariant,
		type ButtonSize
	} from '#lib/components/ui/button/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'secondary',
		size = 'md',
		...restProps
	}: AlertDialogPrimitive.CancelProps & {
		variant?: ButtonVariant;
		size?: ButtonSize;
	} = $props();
</script>

<AlertDialogPrimitive.Cancel
	bind:ref
	data-slot="alert-dialog-cancel"
	class={cn(buttonVariants({ variant, size }), '', className)}
	{...restProps}
/>
