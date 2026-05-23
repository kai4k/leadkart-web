<!-- src/lib/components/ui/accordion/Accordion.svelte -->
<!--
	Accordion.Root — bits-ui Accordion.Root wrapper.

	bits-ui handles ARIA disclosure semantics (button + region), focus,
	arrow-key navigation between triggers, and Enter/Space activation.

	Tagged union by `type`:
	  - 'single' (default): one item open at a time, value is string.
	  - 'multiple':         many items open, value is string[].

	The two-overload pattern below mirrors bits-ui's type contract so
	consumers get the right `value` type for the `type` they choose.
-->
<script lang="ts">
	import { Accordion as BitsAccordion } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type SingleProps = {
		type?: 'single';
		value?: string;
		onValueChange?: (value: string) => void;
	};

	type MultipleProps = {
		type: 'multiple';
		value?: string[];
		onValueChange?: (value: string[]) => void;
	};

	type Props = (SingleProps | MultipleProps) & {
		disabled?: boolean;
		loop?: boolean;
		class?: string;
		children: Snippet;
	};

	let {
		type = 'single' as const,
		value = $bindable(),
		onValueChange,
		disabled = false,
		loop = true,
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

{#if type === 'multiple'}
	<BitsAccordion.Root
		type="multiple"
		bind:value={value as string[] | undefined}
		onValueChange={onValueChange as ((v: string[]) => void) | undefined}
		{disabled}
		{loop}
		class={cn('border-border w-full divide-y', className)}
		{...rest}
	>
		{@render children()}
	</BitsAccordion.Root>
{:else}
	<BitsAccordion.Root
		type="single"
		bind:value={value as string | undefined}
		onValueChange={onValueChange as ((v: string) => void) | undefined}
		{disabled}
		{loop}
		class={cn('border-border w-full divide-y', className)}
		{...rest}
	>
		{@render children()}
	</BitsAccordion.Root>
{/if}
