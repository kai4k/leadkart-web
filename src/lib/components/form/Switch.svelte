<!-- src/lib/components/form/Switch.svelte -->
<!--
	Switch — labelled toggle over bits-ui Switch.

	bits-ui provides the button + role=switch + aria-checked semantics,
	keyboard Space toggle, and a hidden form input (rendered if `name`
	is provided) for native form submission.

	Visual: 36×20 track; 16×16 thumb; off=bg-muted; on=primary. Thumb
	translates 16px right when checked, animated via Tailwind transform.

	Used both standalone and as a settings-row toggle. The `label`
	prop wires up a real <label for=...> for screen readers + click-
	target expansion. Use `srLabel` to hide the label visually
	(common in icon-only toggles).
-->
<script lang="ts">
	import { Switch as BitsSwitch } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		label: string;
		srLabel?: boolean;
		hint?: string;
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		disabled?: boolean;
		required?: boolean;
		name?: string;
		value?: string;
		id?: string;
		class?: string;
		labelTrailing?: Snippet;
	};

	let {
		label,
		srLabel = false,
		hint,
		checked = $bindable(false),
		onCheckedChange,
		disabled = false,
		required = false,
		name,
		value,
		id,
		class: className = '',
		labelTrailing
	}: Props = $props();

	const switchId = $derived(id ?? `switch-${label.toLowerCase().replace(/\s+/g, '-')}`);
	const hintId = $derived(`${switchId}-hint`);
</script>

<div class={cn('flex items-start gap-3', className)}>
	<BitsSwitch.Root
		id={switchId}
		bind:checked
		{onCheckedChange}
		{disabled}
		{required}
		{name}
		{value}
		aria-describedby={hint ? hintId : undefined}
		class={cn(
			'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full',
			'transition-colors duration-[var(--duration-fast)]',
			'data-[state=unchecked]:bg-bg-muted data-[state=checked]:bg-primary',
			'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-50'
		)}
	>
		<BitsSwitch.Thumb
			class={cn(
				'pointer-events-none block size-4 rounded-full bg-white shadow-sm',
				'transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]',
				'translate-x-0.5',
				'data-[state=checked]:translate-x-4'
			)}
		/>
	</BitsSwitch.Root>

	{#if !srLabel || hint}
		<div class="flex min-w-0 flex-col">
			<label for={switchId} class={cn('body-sm text-fg font-medium', srLabel && 'sr-only')}>
				{label}
				{#if labelTrailing}{@render labelTrailing()}{/if}
			</label>
			{#if hint}
				<p id={hintId} class="caption text-fg-muted">{hint}</p>
			{/if}
		</div>
	{:else}
		<label for={switchId} class="sr-only">{label}</label>
	{/if}
</div>
