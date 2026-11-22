<!--
	Switch — labelled toggle on the regenerated `ui/switch` (bits Switch).

	bits-ui provides the button + role=switch + aria-checked semantics, Space to toggle, and a
	hidden form input (rendered when `name` is passed) for native form submission.

	The `label` prop is a real <label for=...> (screen readers + a larger click target); `srLabel`
	hides it visually (icon-only toggles). `hint` is the description, linked by `aria-describedby`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Switch as SwitchControl } from '#lib/components/ui/switch/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	type Props = {
		label: string;
		srLabel?: boolean;
		hint?: string;
		/** The server's (or form's) message for this control; shown under the label and linked by `aria-describedby`. */
		error?: string | null;
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
		error,
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

	const uid = $props.id();
	const switchId = $derived(id ?? `switch-${uid}`);
	const hintId = $derived(`${switchId}-hint`);
	const errorId = $derived(`${switchId}-error`);
	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<Field.Field orientation="horizontal" class={cn('items-start gap-3', className)}>
	<SwitchControl
		id={switchId}
		bind:checked
		{onCheckedChange}
		{disabled}
		{required}
		{name}
		{value}
		aria-describedby={describedBy}
		aria-invalid={error ? 'true' : undefined}
	/>

	<Field.Content>
		<Field.Label for={switchId} class={srLabel ? 'sr-only' : undefined}>
			{label}
			{#if labelTrailing}{@render labelTrailing()}{/if}
		</Field.Label>
		{#if hint}
			<Field.Description id={hintId}>{hint}</Field.Description>
		{/if}
		{#if error}
			<Field.Error id={errorId}>{error}</Field.Error>
		{/if}
	</Field.Content>
</Field.Field>
