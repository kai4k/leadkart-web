<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	export const toggleVariants = cva(
		[
			'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium',
			'hover:bg-bg-muted hover:text-fg-muted',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
			'disabled:pointer-events-none disabled:opacity-50',
			'data-[state=on]:bg-bg-muted data-[state=on]:text-fg'
		],
		{
			variants: {
				variant: {
					default: 'bg-transparent',
					outline: 'border border-border bg-transparent hover:bg-bg-muted'
				},
				size: {
					default: 'h-10 px-3',
					sm: 'h-9 px-2.5',
					lg: 'h-11 px-5'
				}
			},
			defaultVariants: { variant: 'default', size: 'default' }
		}
	);
	export type ToggleVariants = VariantProps<typeof toggleVariants>;
</script>

<script lang="ts">
	import { Toggle as TogglePrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		pressed = $bindable(false),
		variant = 'default',
		size = 'default',
		...rest
	}: TogglePrimitive.RootProps & ToggleVariants = $props();
</script>

<TogglePrimitive.Root
	bind:ref
	bind:pressed
	data-slot="toggle"
	class={cn(toggleVariants({ variant, size }), className)}
	{...rest}
/>
