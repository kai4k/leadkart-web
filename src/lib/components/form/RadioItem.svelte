<!-- src/lib/components/form/RadioItem.svelte -->
<!--
	RadioItem — single radio inside a RadioGroup.

	Composes a 16px circle (the radio control) with a label. Selected
	state shows a smaller filled dot inside via Tailwind's
	`data-[state=checked]:*:opacity-100` pattern — targets the
	indicator child when the button itself carries data-state=checked.
-->
<script lang="ts">
	import { RadioGroup as BitsRadioGroup } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		value: string;
		label?: string;
		hint?: string;
		disabled?: boolean;
		id?: string;
		class?: string;
		children?: Snippet;
	};

	let {
		value,
		label,
		hint,
		disabled = false,
		id,
		class: className = '',
		children
	}: Props = $props();

	const itemId = $derived(id ?? `radio-item-${value}`);
</script>

<label
	for={itemId}
	class={cn(
		'flex cursor-pointer items-start gap-2 select-none',
		disabled && 'cursor-not-allowed opacity-60',
		className
	)}
>
	<BitsRadioGroup.Item
		id={itemId}
		{value}
		{disabled}
		class={cn(
			'relative mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full',
			'border-border border bg-[var(--color-bg-elevated)]',
			'transition-colors duration-[var(--duration-fast)]',
			'data-[state=checked]:border-primary',
			'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-50',
			// Reveal the inner indicator span when this button is checked.
			'data-[state=checked]:[&>span]:scale-100 data-[state=checked]:[&>span]:opacity-100'
		)}
	>
		<span
			class={cn(
				'bg-primary block size-2 scale-0 rounded-full opacity-0',
				'transition-[opacity,transform] duration-[var(--duration-fast)]'
			)}
		></span>
	</BitsRadioGroup.Item>

	{#if children}
		{@render children()}
	{:else if label}
		<span class="flex min-w-0 flex-col">
			<span class="body-sm text-fg">{label}</span>
			{#if hint}<span class="caption text-fg-muted">{hint}</span>{/if}
		</span>
	{/if}
</label>
