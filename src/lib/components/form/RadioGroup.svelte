<!-- src/lib/components/form/RadioGroup.svelte -->
<!--
	RadioGroup — the regenerated `ui/radio-group` (bits RadioGroup) with the field anatomy around it.

	bits-ui handles the radiogroup / radio roles, arrow-key movement between items, Tab into the
	group, and a hidden form input (rendered when `name` is passed). The group is named by its
	label (`aria-labelledby`) and described by the hint and the error.

	Layout via `orientation`: 'vertical' (default) stacks the items, 'horizontal' puts them in a row.

	Used compound:
	  <RadioGroup label="Plan" bind:value>
	    <RadioItem value="starter" label="Starter" />
	    <RadioItem value="pro" label="Pro" />
	  </RadioGroup>
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { RadioGroup as RadioGroupRoot } from '#lib/components/ui/radio-group/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	type Props = {
		label?: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		value?: string;
		onValueChange?: (value: string) => void;
		orientation?: 'horizontal' | 'vertical';
		disabled?: boolean;
		required?: boolean;
		name?: string;
		class?: string;
		children: Snippet;
	};

	let {
		label,
		srLabel = false,
		hint,
		error,
		value = $bindable(''),
		onValueChange,
		orientation = 'vertical',
		disabled = false,
		required = false,
		name,
		class: className = '',
		children
	}: Props = $props();

	const uid = $props.id();
	const groupId = $derived(`radio-${uid}`);
	const hintId = $derived(`${groupId}-hint`);
	const errorId = $derived(`${groupId}-error`);

	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<Field.Field class={className}>
	{#if label}
		<Field.Title id={groupId} class={srLabel ? 'sr-only' : undefined}>{label}</Field.Title>
	{/if}

	<RadioGroupRoot
		bind:value
		{onValueChange}
		{orientation}
		{disabled}
		{required}
		{name}
		aria-labelledby={label ? groupId : undefined}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
		class={cn(
			orientation === 'horizontal' ? 'flex flex-row flex-wrap gap-4' : 'flex flex-col gap-2'
		)}
	>
		{@render children()}
	</RadioGroupRoot>

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{/if}
</Field.Field>
