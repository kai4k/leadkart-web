<!-- src/lib/components/form/RadioItem.svelte -->
<!--
	RadioItem — one radio inside a RadioGroup, on the regenerated `ui/radio-group` item.

	The whole row is a <label for=...>, so the text names the radio and a click anywhere selects it.
	The id comes from `$props.id()` (never from the value), so the same value in two groups on one
	page never collides.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { RadioGroupItem } from '#lib/components/ui/radio-group/index.ts';
	import { cn } from '#lib/utils/cn.ts';

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

	const uid = $props.id();
	const itemId = $derived(id ?? `radio-item-${uid}`);
</script>

<label
	for={itemId}
	class={cn(
		'flex cursor-pointer items-start gap-2 select-none',
		disabled && 'cursor-not-allowed opacity-60',
		className
	)}
>
	<RadioGroupItem id={itemId} {value} {disabled} class="mt-0.5" />

	{#if children}
		{@render children()}
	{:else if label}
		<span class="flex min-w-0 flex-col">
			<span class="text-sm text-foreground">{label}</span>
			{#if hint}<span class="text-sm text-muted-foreground">{hint}</span>{/if}
		</span>
	{/if}
</label>
