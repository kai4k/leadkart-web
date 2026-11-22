<script lang="ts">
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { toSingleLine } from '#lib/utils/single-line.ts';

	/**
	 * TextareaField — labelled multi-line input on the regenerated `ui/textarea` and the one field
	 * anatomy. Same surface as TextField: label, hint, error (`aria-invalid`; read with the field,
	 * the form moves focus to it on a failed submit), and a counter once `maxlength` is set. The
	 * counter is NOT live: it reads "{n} of {max} characters" when the field is focused (it is part of
	 * `aria-describedby`), and one polite announcement is made when the text reaches 90% of the limit
	 * and one at the limit, never per keystroke. The id comes from `$props.id()` unless the caller
	 * passes one.
	 *
	 * `singleLine` (a reason Go refuses line breaks in): Enter does what it does in a single-line field (submits the
	 * surrounding form, else nothing), and pasted or autofilled breaks and tabs become one space as they arrive.
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
		singleLine?: boolean;
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
		singleLine = false,
		id,
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `textarea-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const counterId = $derived(`${fieldId}-counter`);

	const level = $derived(
		!maxlength
			? null
			: value.length >= maxlength
				? 'limit'
				: value.length >= Math.ceil(maxlength * 0.9)
					? 'near'
					: null
	);
	// Changes only when `level` does, so the live region speaks twice at most per approach.
	let announcement = $state('');
	$effect(() => {
		const now = level;
		announcement = untrack(() =>
			now === 'limit'
				? $_('form.counter.limit')
				: now === 'near' && maxlength
					? $_('form.counter.near', { values: { remaining: maxlength - value.length } })
					: ''
		);
	});

	function onkeydown(e: KeyboardEvent) {
		if (!singleLine || e.key !== 'Enter' || e.isComposing) return;
		e.preventDefault();
		(e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
	}
	// a soft keyboard's return key arrives as an input type, not a key
	function onbeforeinput(e: InputEvent) {
		if (singleLine && (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph'))
			e.preventDefault();
	}
	function oninput(e: Event & { currentTarget: HTMLTextAreaElement }) {
		if (!singleLine) return;
		const el = e.currentTarget;
		const clean = toSingleLine(el.value);
		if (clean === el.value) return;
		el.value = clean;
		value = clean;
	}

	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null, maxlength ? counterId : null]
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
		{onkeydown}
		{onbeforeinput}
		{oninput}
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
				<span id={counterId} class="ms-auto shrink-0 text-sm text-muted-foreground tabular-nums">
					<span aria-hidden="true">{value.length}/{maxlength}</span>
					<span class="sr-only">
						{$_('form.counter.characters', { values: { n: value.length, max: maxlength } })}
					</span>
				</span>
				<span class="sr-only" role="status">{announcement}</span>
			{/if}
		</div>
	{/if}
</Field.Field>
