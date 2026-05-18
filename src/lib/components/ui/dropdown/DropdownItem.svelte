<!-- src/lib/components/ui/dropdown/DropdownItem.svelte -->
<!--
	DropdownItem — keyboard-navigable menu item.

	variant='default' : standard item with brand highlight on keyboard/hover focus.
	variant='danger'  : red-tinted item for destructive actions (delete, revoke, etc.).

	bits-ui sets data-[highlighted] when the item is keyboard-focused or
	pointer-hovered — this is the CSS state hook for interactive styling.
-->
<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		variant?: 'default' | 'danger';
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
	class={cn(
		'flex cursor-default items-center gap-2 select-none',
		'rounded-lg px-3 py-2 text-sm outline-none',
		'transition-colors duration-[var(--duration-fast)]',
		variant === 'default' && [
			'text-[var(--color-fg)]',
			'data-[highlighted]:bg-[var(--color-brand-50)] data-[highlighted]:text-[var(--color-brand-600)]'
		],
		variant === 'danger' && [
			'text-[var(--color-danger-700)]',
			'data-[highlighted]:bg-[var(--color-danger-50)] data-[highlighted]:text-[var(--color-danger-700)]'
		],
		'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
		className
	)}
	{...rest}
>
	{@render children()}
</BitsMenu.Item>
