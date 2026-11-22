<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { ChevronDown, Icon } from '#lib/icons/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { fieldControlClass } from './field-control.ts';

	/**
	 * Select — labelled native <select> (plan decision L36), with the field anatomy of TextField
	 * (label / srLabel / hint / error), so a form reaches for either without learning two APIs.
	 *
	 * Why a native <select>, not the regenerated bits `ui/select`:
	 *   - the browser gives the combobox/listbox semantics, arrow keys, type-to-jump, Home/End;
	 *   - the native picker on iOS and Android;
	 *   - it works in a server-action form without JS, and e2e `selectOption` keeps working.
	 *
	 * A stored value the list does not offer (a locale or time zone saved through the API, an option since
	 * retired) is shown as one more option and posted unchanged: the field never goes blank under a value
	 * that is still saved.
	 *
	 * Styled by `fieldControlClass` (the field tokens of `ui/input`). The chevron is the registry's ChevronDown, drawn over the select with
	 * `pointer-events-none`. Rich items, images and search belong to Combobox.
	 */

	export interface SelectOption {
		value: string;
		label: string;
	}

	type Props = Omit<HTMLSelectAttributes, 'class' | 'value' | 'required'> & {
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		/** Visible required mark and `aria-required`. */
		required?: boolean;
		value?: string;
		options: ReadonlyArray<SelectOption>;
		placeholder?: string;
		class?: string;
	};

	let {
		label,
		srLabel = false,
		hint,
		error,
		required = false,
		id,
		value = $bindable(''),
		options,
		placeholder,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `select-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	// A value outside `options` stays selectable: dropping it would show a blank field and post nothing.
	const unlisted = $derived(
		typeof value === 'string' && value !== '' && !options.some((o) => o.value === value)
			? value
			: null
	);

	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<Field.Field class={className}>
	<Field.Label for={fieldId} {required} class={srLabel ? 'sr-only' : undefined}>
		{label}
	</Field.Label>

	<div class="relative">
		<select
			id={fieldId}
			data-slot="select"
			bind:value
			{required}
			aria-required={required ? 'true' : undefined}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			class={cn(fieldControlClass, 'appearance-none ps-3 pe-10')}
			{...rest}
		>
			{#if placeholder}
				<option value="" disabled selected={!value}>{placeholder}</option>
			{/if}
			{#each options as opt (opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
			{#if unlisted !== null}
				<option value={unlisted}>{unlisted}</option>
			{/if}
		</select>

		<span
			class="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground"
			aria-hidden="true"
		>
			<Icon icon={ChevronDown} size="sm" />
		</span>
	</div>

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{/if}
</Field.Field>
