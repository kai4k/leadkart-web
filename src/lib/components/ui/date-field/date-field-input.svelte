<script lang="ts">
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { DateValue } from '@internationalized/date';
	import { cn } from '#lib/utils/cn.ts';
	import { toDateOnly } from '#lib/utils/date-only.ts';
	import {
		backspace,
		commit,
		EMPTY_PARTS,
		layoutFor,
		parsePaste,
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
	 * Left / Right move, Backspace removes a digit. Virtual keyboards deliver the digits through `input`, read back from the segment's `value`.
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
	// ONE place decides what the segments show and what they emit: (segments, constraints) -> resolved. The date is emitted
	// whenever the resolved value differs from the last one emitted, whatever changed it: a keystroke, a paste, a calendar
	// pick, an outside set, or a constraint (min / max / year bounds), so what is shown is always what is submitted.
	$effect(() => {
		const r = resolve(parts, opts);
		resolved = r;
		const date = r.status === 'valid' ? r.date : undefined;
		const s = toDateOnly(date);
		untrack(() => {
			if (s === known) return;
			known = s;
			value = date;
			onChange?.(date, r);
		});
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
	}

	/** Forget what was typed (a form reset, a programmatic reset): the segments are empty and nothing is emitted. */
	export function clear() {
		parts = { ...EMPTY_PARTS };
	}

	const editable = () =>
		ref
			? [...ref.querySelectorAll<HTMLElement>('[data-segment]:not([data-segment="literal"])')]
			: [];

	// ArrowLeft / ArrowRight follow what is SEEN: in a right-to-left page the first segment is on the right
	const visualStep = (by: 1 | -1): 1 | -1 =>
		ref && getComputedStyle(ref).direction === 'rtl' ? (by === 1 ? -1 : 1) : by;

	function move(from: HTMLElement, by: 1 | -1): HTMLElement | undefined {
		const list = editable();
		const to = list[list.indexOf(from) + by];
		to?.focus();
		return to;
	}

	const isDigit = (k: string) => /^[0-9]$/.test(k);
	const partOf = (el: HTMLElement) => el.dataset.segment as Part;

	/** Type digits as if one by one: each goes to the segment that has focus after the previous one. */
	function typeMany(part: Part, el: HTMLElement, text: string) {
		let p = part;
		let e = el;
		for (const ch of text) {
			if (!isDigit(ch)) continue;
			const r = typeDigit(parts, p, ch);
			change(r.parts);
			if (r.advance) {
				const next = move(e, 1);
				if (next) {
					e = next;
					p = partOf(next);
				}
			}
		}
	}

	function onkeydown(e: KeyboardEvent, part: Part) {
		if (disabled || e.ctrlKey || e.metaKey || e.key === 'Tab' || e.key === 'Escape') return;
		// a virtual keyboard or an IME: the text arrives through input / composition and is read back from `value`
		if (e.key === 'Unidentified' || e.key === 'Process' || e.isComposing || e.keyCode === 229)
			return;
		if (e.altKey) return; // Alt + ArrowDown belongs to the picker (it opens the calendar)
		e.preventDefault();
		const el = e.currentTarget as HTMLElement;
		if (e.key === 'ArrowLeft') return void move(el, visualStep(-1));
		if (e.key === 'ArrowRight') return void move(el, visualStep(1));
		if (e.key === 'Enter') {
			// like a text input: Enter submits the enclosing form
			if (!readonly) el.closest('form')?.requestSubmit();
			return;
		}
		if (readonly) return;
		if (isDigit(e.key)) {
			// typing over a selected segment replaces it (focus selects the content)
			const input = el as HTMLInputElement;
			if (
				input.value !== '' &&
				input.selectionStart === 0 &&
				input.selectionEnd === input.value.length
			)
				change({ ...parts, [part]: '' });
			typeMany(part, el, e.key);
		} else if (e.key === 'Backspace' || e.key === 'Delete') {
			if (e.key === 'Backspace' && parts[part] === '') {
				// an empty segment: go back and delete the previous one's last digit, as a native date input does
				const prev = move(el, -1);
				if (prev) change(backspace(parts, partOf(prev)));
			} else change(backspace(parts, part));
		} else if (e.key === 'ArrowUp') change(step(parts, part, 1, bounds, thisYear));
		else if (e.key === 'ArrowDown') change(step(parts, part, -1, bounds, thisYear));
	}

	function onpaste(e: ClipboardEvent, part: Part) {
		e.preventDefault();
		if (disabled || readonly) return;
		const text = e.clipboardData?.getData('text') ?? '';
		const whole = parsePaste(text, layout.order);
		if (whole) {
			change(whole);
			return;
		}
		// not a whole date: a run of digits is typed from this segment on (nothing else is guessed)
		if (/^\s*\d+\s*$/.test(text)) typeMany(part, e.currentTarget as HTMLElement, text.trim());
	}

	// What a virtual keyboard (Gboard, an IME, voice, autofill) put into the input is read back from its `value`: digits only;
	// the digits beyond what the segment held are typed through the same rules (selecting the content first, as focus does,
	// makes typing replace it), and the input is rewritten with the canonical text. Per event, no field-wide flag: an event
	// that is part of a composition is left alone, `compositionend` reads the final text.
	function reconcile(part: Part, el: HTMLInputElement) {
		const typed = el.value.replace(/\D/g, '');
		const held = parts[part];
		if (typed !== held) {
			if (typed.startsWith(held)) typeMany(part, el, typed.slice(held.length));
			else {
				change({ ...parts, [part]: '' });
				typeMany(part, el, typed);
			}
		}
		el.value = parts[part];
	}
	function oninput(e: Event, part: Part) {
		const el = e.currentTarget as HTMLInputElement;
		if (disabled || readonly) {
			el.value = parts[part];
			return;
		}
		if ((e as InputEvent).isComposing) return;
		reconcile(part, el);
	}
	function oncompositionend(e: CompositionEvent, part: Part) {
		const el = e.currentTarget as HTMLInputElement;
		if (disabled || readonly) el.value = parts[part];
		else reconcile(part, el);
	}
	// focusing a segment selects its content: typing replaces it
	const onfocus = (e: FocusEvent) => (e.currentTarget as HTMLInputElement).select();
	// a click would collapse the selection the focus just made
	const onmouseup = (e: MouseEvent) => {
		const el = e.currentTarget as HTMLInputElement;
		if (el.selectionStart !== el.selectionEnd || el.value === '') return;
		e.preventDefault();
		el.select();
	};

	// leaving a segment pads a lone digit: `1` becomes `01`
	function onfocusout(part: Part) {
		const next = commit(parts, part);
		if (next !== parts) change(next);
	}

	// the enclosing form's native reset clears what was typed (programmatic resets call clear())
	$effect(() => {
		const form = ref?.closest('form');
		if (!form) return;
		const onReset = () => clear();
		form.addEventListener('reset', onReset);
		return () => form.removeEventListener('reset', onReset);
	});

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
			<DateFieldSegment part="literal">{layout.separator}</DateFieldSegment>
		{/if}
		<DateFieldSegment
			{part}
			value={parts[part]}
			id={`${groupId}-${part}`}
			role="spinbutton"
			placeholder={placeholders[part]}
			disabled={disabled || undefined}
			readonly={readonly || undefined}
			spellcheck={false}
			{...{ autocorrect: 'off' }}
			enterkeyhint="done"
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
			aria-invalid={invalid ? 'true' : undefined}
			aria-describedby={describedBy}
			onkeydown={(e: KeyboardEvent) => onkeydown(e, part)}
			oninput={(e: Event) => oninput(e, part)}
			onpaste={(e: ClipboardEvent) => onpaste(e, part)}
			oncompositionend={(e: CompositionEvent) => oncompositionend(e, part)}
			{onfocus}
			{onmouseup}
			onfocusout={() => onfocusout(part)}
		></DateFieldSegment>
	{/each}
</div>
