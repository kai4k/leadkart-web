<script lang="ts">
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { DateValue } from '@internationalized/date';
	import { cn } from '#lib/utils/cn.ts';
	import { toDateOnly } from '#lib/utils/date-only.ts';
	import {
		backspace,
		commit,
		layoutFor,
		partsOf,
		resolve,
		step,
		typeDigit,
		type Part,
		type Parts,
		type Resolved,
		type YearBounds
	} from '#lib/utils/typed-date.ts';
	import DateFieldSegment from './date-field-segment.svelte';

	/**
	 * A typed date: three segments (`role="spinbutton"`) in the locale's order, inside a `role="group"`. It owns the typed
	 * text itself (`#lib/utils/typed-date.ts`), so it shows exactly what was typed and never adjusts it: `31 / 02 / 2026`
	 * stays as typed and is `invalid` (`notExist`); a year with fewer than four digits is `partial`. `value` carries a REAL
	 * date inside the year bounds or nothing; `onChange` fires when that changes because of the user. A `value` the caller
	 * changes (a calendar pick, a form reset) replaces the segments.
	 *
	 *   resolved     what the segments mean now (`empty` | `partial` | `valid` | `invalid` + reason), read by the picker
	 *   describedBy  the error id then the hint id
	 *   invalid      `aria-invalid="true"` on the group (focusFirstInvalid finds it and focuses its first segment)
	 *   labelledBy   the visible label's id; ariaLabel names the group instead (the range's "start" and "end")
	 *
	 * Keys: digits type and advance, Up / Down step (the day wraps at the month's length when the month and year are known),
	 * Left / Right move, Backspace removes a digit. Virtual keyboards deliver the digits through `beforeinput`.
	 */
	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(),
		resolved = $bindable({ status: 'empty' }),
		onChange,
		locale,
		bounds,
		minValue,
		maxValue,
		disabled = false,
		readonly = false,
		required = false,
		describedBy,
		invalid = false,
		labelledBy,
		ariaLabel,
		id,
		...restProps
	}: {
		ref?: HTMLElement | null;
		class?: string;
		value?: DateValue;
		resolved?: Resolved;
		onChange?: (date: DateValue | undefined, resolved: Resolved) => void;
		locale: string;
		bounds: YearBounds;
		minValue?: DateValue;
		maxValue?: DateValue;
		disabled?: boolean;
		readonly?: boolean;
		required?: boolean;
		describedBy?: string;
		invalid?: boolean;
		labelledBy?: string;
		ariaLabel?: string;
		id?: string;
		onkeydowncapture?: (e: KeyboardEvent) => void;
	} = $props();

	const uid = $props.id();
	const groupId = $derived(id ?? `datefield-${uid}`);
	const layout = $derived(layoutFor(locale));
	const thisYear = new Date().getFullYear();

	let parts = $state<Parts>(partsOf(untrack(() => value)));
	// the ISO string of the last date this field emitted or took from `value`: a `value` equal to it is our own echo
	let known = untrack(() => toDateOnly(value));

	const opts = $derived({ bounds, minValue, maxValue });
	$effect(() => {
		resolved = resolve(parts, opts);
	});

	// a date the caller sets (calendar pick, reset, valueString) replaces what is typed
	$effect(() => {
		const s = toDateOnly(value);
		if (s === known) return;
		known = s;
		parts = partsOf(value);
	});

	function change(next: Parts) {
		parts = next;
		const r = resolve(
			next,
			untrack(() => opts)
		);
		const date = r.status === 'valid' ? r.date : undefined;
		const s = toDateOnly(date);
		if (s === known) return;
		known = s;
		value = date;
		onChange?.(date, r);
	}

	const editable = () =>
		ref
			? [...ref.querySelectorAll<HTMLElement>('[data-segment]:not([data-segment="literal"])')]
			: [];

	function move(from: HTMLElement, by: 1 | -1) {
		const list = editable();
		list[list.indexOf(from) + by]?.focus();
	}

	const isDigit = (k: string) => /^[0-9]$/.test(k);

	function type(part: Part, el: HTMLElement, digit: string) {
		const r = typeDigit(parts, part, digit);
		change(r.parts);
		if (r.advance) move(el, 1);
	}

	function onkeydown(e: KeyboardEvent, part: Part) {
		if (disabled || e.ctrlKey || e.metaKey || e.key === 'Tab' || e.key === 'Escape') return;
		if (e.key === 'Unidentified') return; // a virtual keyboard: the digit arrives in beforeinput
		if (e.altKey) return; // Alt + ArrowDown belongs to the picker (it opens the calendar)
		e.preventDefault();
		const el = e.currentTarget as HTMLElement;
		if (e.key === 'ArrowLeft') return move(el, -1);
		if (e.key === 'ArrowRight') return move(el, 1);
		if (readonly) return;
		if (isDigit(e.key)) type(part, el, e.key);
		else if (e.key === 'Backspace' || e.key === 'Delete') change(backspace(parts, part));
		else if (e.key === 'ArrowUp') change(step(parts, part, 1, bounds, thisYear));
		else if (e.key === 'ArrowDown') change(step(parts, part, -1, bounds, thisYear));
	}

	function onbeforeinput(e: InputEvent, part: Part) {
		e.preventDefault();
		if (disabled || readonly) return;
		const el = e.currentTarget as HTMLElement;
		if (e.inputType === 'deleteContentBackward') change(backspace(parts, part));
		else if (e.inputType === 'insertText' && e.data)
			for (const ch of e.data) if (isDigit(ch)) type(part, el, ch);
	}

	// leaving a segment pads a lone digit: `1` becomes `01`
	function onfocusout(part: Part) {
		const next = commit(parts, part);
		if (next !== parts) change(next);
	}

	const range = (part: Part) =>
		part === 'day'
			? { min: 1, max: 31 }
			: part === 'month'
				? { min: 1, max: 12 }
				: { min: bounds.from, max: bounds.to };
	// static keys (the i18n gate reads them): one name and one placeholder per part
	const names = $derived({
		day: $_('form.dateField.day'),
		month: $_('form.dateField.month'),
		year: $_('form.dateField.year')
	});
	const placeholders = $derived({
		day: $_('form.dateField.dayPlaceholder'),
		month: $_('form.dateField.monthPlaceholder'),
		year: $_('form.dateField.yearPlaceholder')
	});
	const text = (part: Part) => parts[part] || placeholders[part];
</script>

<!-- aria-invalid on the group is the contract (focusFirstInvalid finds it; axe accepts it as a global attribute) -->
<!-- svelte-ignore a11y_role_supports_aria_props -->
<div
	bind:this={ref}
	id={groupId}
	data-slot="date-field-input"
	role="group"
	class={cn('flex flex-1 items-center', className)}
	aria-describedby={describedBy}
	aria-invalid={invalid ? 'true' : undefined}
	aria-labelledby={ariaLabel ? undefined : labelledBy}
	aria-label={ariaLabel}
	{...restProps}
>
	{#each layout.order as part, i (part)}
		{#if i > 0}
			<DateFieldSegment part="literal" aria-hidden="true">{layout.separator}</DateFieldSegment>
		{/if}
		<DateFieldSegment
			{part}
			empty={parts[part] === ''}
			id={`${groupId}-${part}`}
			role="spinbutton"
			contenteditable={disabled || readonly ? undefined : 'true'}
			tabindex={disabled ? undefined : 0}
			spellcheck={false}
			inputmode="numeric"
			{...{ autocorrect: 'off' }}
			enterkeyhint="next"
			aria-label={names[part]}
			aria-labelledby={labelledBy ? `${groupId}-${part} ${labelledBy}` : undefined}
			aria-valuemin={range(part).min}
			aria-valuemax={range(part).max}
			aria-valuenow={parts[part] !== '' && Number(parts[part]) >= range(part).min
				? Number(parts[part])
				: undefined}
			aria-valuetext={parts[part] === '' ? $_('form.dateField.empty') : parts[part]}
			aria-disabled={disabled ? 'true' : undefined}
			aria-readonly={readonly ? 'true' : undefined}
			aria-required={required ? 'true' : undefined}
			onkeydown={(e: KeyboardEvent) => onkeydown(e, part)}
			onbeforeinput={(e: InputEvent) => onbeforeinput(e, part)}
			onfocusout={() => onfocusout(part)}
		>
			{text(part)}
		</DateFieldSegment>
	{/each}
</div>
