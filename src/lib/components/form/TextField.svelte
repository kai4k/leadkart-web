<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * TextField — labelled text input. Every input has a programmatically associated label
	 * (WAI-ARIA APG); a placeholder is never the label.
	 *
	 * Anatomy (the one field wrapper, `ui/field`): label, the control, the hint, the error.
	 * `aria-describedby` lists the hint and the error that are present; `aria-invalid` is set
	 * with the error, which is announced (`role="alert"`). The id comes from `$props.id()` unless
	 * the caller passes one, never from the label text, so two fields with one label never collide.
	 *
	 * Surfaces:
	 *   - label (required; `srLabel` hides it visually)
	 *   - hint, error
	 *   - leading / trailing slots for icons or in-field actions
	 */

	type Props = Omit<HTMLInputAttributes, 'class' | 'value' | 'type' | 'files'> & {
		/** Any input type except `file` (use FileDropZone). */
		type?: Exclude<HTMLInputTypeAttribute, 'file'>;
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		value?: string;
		leading?: Snippet;
		trailing?: Snippet;
		class?: string;
	};

	let {
		label,
		srLabel = false,
		hint,
		error,
		id,
		value = $bindable(''),
		leading,
		trailing,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `field-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<Field.Field class={className}>
	<Field.Label for={fieldId} class={srLabel ? 'sr-only' : undefined}>{label}</Field.Label>

	<div class="relative">
		{#if leading}
			<span
				class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-muted-foreground"
				aria-hidden="true"
			>
				{@render leading()}
			</span>
		{/if}

		<Input
			id={fieldId}
			bind:value
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			class={cn(leading && 'ps-10', trailing && 'pe-10')}
			{...rest}
		/>

		{#if trailing}
			<span class="absolute inset-y-0 end-0 flex items-center pe-2">
				{@render trailing()}
			</span>
		{/if}
	</div>

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{/if}
</Field.Field>
