<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { TEXT_FORMATS, type TextFormat } from '#lib/utils/indian-formats.ts';

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
	 *
	 * `format` ('email' | 'phone' | 'pincode' | 'gstin' | 'pan' | 'code', the table in `indian-formats.ts`) sets what a
	 * phone keyboard needs (input `type`, `inputmode`, `autocapitalize`, `autocorrect`, `spellcheck`, a default
	 * `autocomplete`; the caller's own attribute wins) and tidies the text when the field is left and when text is
	 * pasted, writing the tidied text back, so what is shown is what is sent.
	 *
	 * `maxlength` is checked here, not by the browser: the browser silently cuts a paste at the limit, which changes
	 * what the person meant (a 61-character slug becomes another slug). The text is kept and the field says it is too long.
	 */

	type Props = Omit<HTMLInputAttributes, 'class' | 'value' | 'type' | 'files' | 'required'> & {
		/** Any input type except `file` (use FileDropZone). */
		type?: Exclude<HTMLInputTypeAttribute, 'file'>;
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		value?: string;
		format?: TextFormat;
		/** Visible required mark and `aria-required`. */
		required?: boolean;
		/** Characters (UTF-16 units, as the browser counts). Never cuts text: over the limit the field shows an error. */
		maxlength?: number;
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
		format,
		required = false,
		maxlength,
		type,
		onblur,
		oninput,
		leading,
		trailing,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `field-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const spec = $derived(format ? TEXT_FORMATS[format] : undefined);
	const tooLong = $derived(
		maxlength !== undefined && value.length > maxlength
			? $_('form.textTooLong', { values: { max: maxlength } })
			: null
	);
	const shownError = $derived(error || tooLong);
	const describedBy = $derived(
		[shownError ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);

	/** Write the tidied text into the input and the bound value, so the next reader sees what is shown. */
	function tidy(el: HTMLInputElement): void {
		if (!spec) return;
		const next = spec.tidy(el.value);
		if (next === el.value) return;
		el.value = next;
		value = next;
	}
</script>

<Field.Field class={className}>
	<Field.Label for={fieldId} {required} class={srLabel ? 'sr-only' : undefined}>
		{label}
	</Field.Label>

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
			type={type ?? spec?.type}
			inputmode={spec?.inputmode}
			autocapitalize={spec?.autocapitalize}
			autocorrect={spec?.autocorrect}
			spellcheck={spec?.spellcheck}
			autocomplete={spec?.autocomplete as HTMLInputAttributes['autocomplete']}
			{required}
			aria-required={required ? 'true' : undefined}
			aria-invalid={shownError ? 'true' : undefined}
			aria-describedby={describedBy}
			class={cn(leading && 'ps-10', trailing && 'pe-10')}
			onblur={(e) => {
				tidy(e.currentTarget);
				onblur?.(e);
			}}
			oninput={(e) => {
				// a paste is tidied at once (a GSTIN pasted in lower case with a trailing space); typing is left alone
				if (/^insertFrom(Paste|Drop)/.test((e as unknown as InputEvent).inputType))
					tidy(e.currentTarget);
				oninput?.(e);
			}}
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

	{#if shownError}
		<Field.Error id={errorId}>{shownError}</Field.Error>
	{/if}
</Field.Field>
