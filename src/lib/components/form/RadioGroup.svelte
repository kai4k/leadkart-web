<!-- src/lib/components/form/RadioGroup.svelte -->
<!--
	RadioGroup — bits-ui RadioGroup wrapper.

	bits-ui handles ARIA radiogroup / radio roles, arrow-key navigation
	between items, Tab to focus the group + arrow keys to move within,
	and a hidden form input (rendered if `name` provided).

	Layout via the `orientation` prop:
	  - 'vertical'   (default): items stacked
	  - 'horizontal': items inline

	Used compound:
	  <RadioGroup label="Plan" bind:value>
	    <RadioItem value="starter" label="Starter" />
	    <RadioItem value="pro" label="Pro" />
	  </RadioGroup>
-->
<script lang="ts">
	import { RadioGroup as BitsRadioGroup } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

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

	const groupId = $derived(
		`radio-${(label ?? name ?? 'group').toLowerCase().replace(/\s+/g, '-')}`
	);
	const hintId = $derived(`${groupId}-hint`);
	const errorId = $derived(`${groupId}-error`);

	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={cn('stack stack-tight', className)}>
	{#if label}
		<span id={groupId} class={cn('label text-fg', srLabel && 'sr-only')}>{label}</span>
	{/if}

	<BitsRadioGroup.Root
		bind:value
		{onValueChange}
		{orientation}
		{disabled}
		{required}
		{name}
		aria-labelledby={label ? groupId : undefined}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
		class={cn('flex', orientation === 'horizontal' ? 'flex-row flex-wrap gap-4' : 'flex-col gap-2')}
	>
		{@render children()}
	</BitsRadioGroup.Root>

	{#if hint && !error}
		<p id={hintId} class="caption">{hint}</p>
	{/if}

	{#if error}
		<p id={errorId} class="body-sm text-danger-700">{error}</p>
	{/if}
</div>
