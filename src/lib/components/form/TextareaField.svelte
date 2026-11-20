<script lang="ts">
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';

	/**
	 * TextareaField — labelled multi-line input on the regenerated `ui/textarea` and the one field
	 * anatomy. Same surface as TextField: label, hint, error (announced, `aria-invalid`), and a
	 * live counter `"{n}/{max}"` (`aria-live="polite"`, part of `aria-describedby`) once `maxlength`
	 * is set. The id comes from `$props.id()` unless the caller passes one.
	 */

	type Props = {
		label: string;
		name: string;
		value: string;
		rows?: number;
		maxlength?: number;
		hint?: string;
		error?: string | null;
		required?: boolean;
		placeholder?: string;
		disabled?: boolean;
		id?: string;
		class?: string;
	};

	let {
		label,
		name,
		value = $bindable(''),
		rows = 3,
		maxlength,
		hint,
		error,
		required = false,
		placeholder,
		disabled = false,
		id,
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `textarea-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const counterId = $derived(`${fieldId}-counter`);

	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null, maxlength ? counterId : null]
			.filter(Boolean)
			.join(' ') || undefined
	);
</script>

<Field.Field class={className}>
	<Field.Label for={fieldId}>{label}</Field.Label>

	<Textarea
		id={fieldId}
		{name}
		bind:value
		{rows}
		{maxlength}
		{required}
		{placeholder}
		{disabled}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
	/>

	{#if hint || error || maxlength}
		<div class="flex items-start justify-between gap-3">
			<div class="flex min-w-0 flex-col gap-1">
				{#if hint}
					<Field.Description id={hintId}>{hint}</Field.Description>
				{/if}
				{#if error}
					<Field.Error id={errorId}>{error}</Field.Error>
				{/if}
			</div>
			{#if maxlength}
				<span
					id={counterId}
					aria-live="polite"
					class="ms-auto shrink-0 text-sm text-muted-foreground tabular-nums"
				>
					{value.length}/{maxlength}
				</span>
			{/if}
		</div>
	{/if}
</Field.Field>
