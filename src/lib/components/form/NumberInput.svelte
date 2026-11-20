<script lang="ts" module>
	/**
	 * NumberInput — stepped numeric input with flanking ±-buttons.
	 *
	 * Industry refs: Material 3 number-input, Atlassian Form NumberInput,
	 * GitHub Primer Number, Linear's quantity stepper.
	 *
	 * Behaviour:
	 *   - +/− buttons step by `step`; disabled at min/max.
	 *   - ArrowUp / ArrowDown step by `step`; Shift+Arrow steps by step×10.
	 *   - Blur parses the text in the active locale ("1,00,000" in en-IN is 100000), clamps to
	 *     [min, max] and rounds to `precision` decimals. Text that is not a number keeps the previous
	 *     value, restores it in the field and marks the field invalid; it is never silently cleared.
	 *   - Empty string preserved as null in `value`.
	 *   - prefix / suffix render inside the field at the inline edges.
	 */
</script>

<script lang="ts">
	import { _, locale as i18nLocale } from 'svelte-i18n';
	import { parseLocaleNumber } from '#lib/utils/parse-number.ts';
	import { Icon, Minus, Plus } from '#lib/icons/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	type Props = {
		value: number | null;
		min?: number;
		max?: number;
		step?: number;
		precision?: number;
		placeholder?: string;
		disabled?: boolean;
		prefix?: string;
		suffix?: string;
		name?: string;
		id?: string;
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		'aria-label'?: string;
		/** BCP 47 tag the typed text is read in. Default: the active interface locale. */
		locale?: string;
		class?: string;
	};

	let {
		value = $bindable(null),
		min,
		max,
		step = 1,
		precision = 0,
		placeholder,
		disabled = false,
		prefix,
		suffix,
		name,
		id,
		label,
		srLabel = false,
		hint,
		error,
		'aria-label': ariaLabel,
		locale,
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `number-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const activeLocale = $derived(locale ?? $i18nLocale ?? 'en');
	// Set when the last commit could not read the text as a number; cleared on the next keystroke.
	let unreadable = $state(false);
	const shownError = $derived(error || (unreadable ? $_('form.number.invalid') : null));
	const describedBy = $derived(
		[shownError ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);

	let displayValue = $state(value === null || Number.isNaN(value) ? '' : String(value));

	$effect(() => {
		// Sync external value → display when caller mutates value directly
		const next = value === null || Number.isNaN(value) ? '' : String(value);
		if (next !== displayValue && document.activeElement?.id !== fieldId) {
			displayValue = next;
		}
	});

	function clamp(n: number): number {
		if (min !== undefined && n < min) return min;
		if (max !== undefined && n > max) return max;
		return n;
	}

	function round(n: number): number {
		if (precision === 0) return Math.round(n);
		const factor = 10 ** precision;
		return Math.round(n * factor) / factor;
	}

	function commit(raw: string) {
		if (raw.trim() === '') {
			unreadable = false;
			value = null;
			displayValue = '';
			return;
		}
		const parsed = parseLocaleNumber(raw, activeLocale);
		if (parsed === null) {
			// Keep what was there; show it again so the field and the value agree.
			unreadable = true;
			displayValue = value === null || Number.isNaN(value) ? '' : String(value);
			return;
		}
		unreadable = false;
		const next = round(clamp(parsed));
		value = next;
		displayValue = String(next);
	}

	function nudge(delta: number) {
		const base = value ?? min ?? 0;
		commit(String(round(base + delta)));
	}

	const isAtMin = $derived(value !== null && min !== undefined && value <= min);
	const isAtMax = $derived(value !== null && max !== undefined && value >= max);

	function onKeyDown(e: KeyboardEvent) {
		const multiplier = e.shiftKey ? 10 : 1;
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			nudge(step * multiplier);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			nudge(-step * multiplier);
		}
	}
</script>

<Field.Field class={className}>
	<Field.Label for={fieldId} class={srLabel ? 'sr-only' : undefined}>{label}</Field.Label>

	<div class="flex items-stretch gap-1">
		<Button
			variant="outline"
			size="icon"
			aria-label="Decrement"
			disabled={disabled || isAtMin}
			onclick={() => nudge(-step)}
			tabindex={-1}
		>
			<Icon icon={Minus} size="sm" />
		</Button>

		<div class="relative flex-1">
			{#if prefix}
				<span
					class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-sm text-muted-foreground"
					aria-hidden="true"
				>
					{prefix}
				</span>
			{/if}

			<Input
				id={fieldId}
				type="text"
				inputmode={precision > 0 ? 'decimal' : 'numeric'}
				role="spinbutton"
				aria-valuenow={value ?? undefined}
				aria-valuemin={min}
				aria-valuemax={max}
				aria-label={srLabel ? (ariaLabel ?? label) : undefined}
				aria-invalid={shownError ? 'true' : undefined}
				aria-describedby={describedBy}
				{name}
				{placeholder}
				{disabled}
				value={displayValue}
				oninput={(e) => {
					displayValue = e.currentTarget.value;
					unreadable = false;
				}}
				onblur={() => commit(displayValue)}
				onkeydown={onKeyDown}
				class={cn('text-center tabular-nums', prefix && 'ps-7', suffix && 'pe-7')}
			/>

			{#if suffix}
				<span
					class="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-muted-foreground"
					aria-hidden="true"
				>
					{suffix}
				</span>
			{/if}
		</div>

		<Button
			variant="outline"
			size="icon"
			aria-label="Increment"
			disabled={disabled || isAtMax}
			onclick={() => nudge(step)}
			tabindex={-1}
		>
			<Icon icon={Plus} size="sm" />
		</Button>
	</div>

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if shownError}
		<Field.Error id={errorId}>{shownError}</Field.Error>
	{/if}
</Field.Field>
