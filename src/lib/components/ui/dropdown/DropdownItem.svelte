<!-- src/lib/components/ui/dropdown/DropdownItem.svelte -->
<!--
	DropdownItem — keyboard-navigable menu item.

	variant='default' : standard item with brand highlight on keyboard/hover focus.
	variant='danger'  : red-tinted item for destructive actions (delete, revoke, etc.).

	bits-ui sets data-[highlighted] when the item is keyboard-focused or
	pointer-hovered — this is the CSS state hook for interactive styling.
-->
<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const dropdownItemVariants = cva(
		[
			'flex cursor-default items-center gap-2 select-none',
			'rounded-lg px-3 py-2 text-sm outline-none',
			'transition-colors duration-[var(--duration-fast)]',
			'data-[disabled]:pointer-events-none data-[disabled]:opacity-40'
		],
		{
			variants: {
				variant: {
					default: ['text-fg', 'data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-600'],
					danger: [
						'text-danger-700',
						'data-[highlighted]:bg-danger-50 data-[highlighted]:text-danger-700'
					]
				}
			},
			defaultVariants: { variant: 'default' }
		}
	);

	export type DropdownItemVariants = VariantProps<typeof dropdownItemVariants>;
</script>

<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		variant?: NonNullable<DropdownItemVariants['variant']>;
		disabled?: boolean;
		onSelect?: () => void;
		children: Snippet;
		[key: string]: unknown;
	};

	let {
		class: className = '',
		variant = 'default',
		disabled = false,
		onSelect,
		children,
		...rest
	}: Props = $props();
</script>

<BitsMenu.Item
	{disabled}
	{onSelect}
	class={cn(dropdownItemVariants({ variant }), className)}
	{...rest}
>
	{@render children()}
</BitsMenu.Item>
