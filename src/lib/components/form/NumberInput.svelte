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
	 *   - Blur clamps to [min, max] + rounds to `precision` decimals.
	 *   - Empty string preserved as null in `value`.
	 *   - prefix / suffix render inside the field at the inline edges.
	 */
</script>

<script lang="ts">
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
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `number-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
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
			value = null;
			displayValue = '';
			return;
		}
		const parsed = Number(raw);
		if (Number.isNaN(parsed)) {
			value = null;
			displayValue = '';
			return;
		}
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
				aria-invalid={error ? 'true' : undefined}
				aria-describedby={describedBy}
				{name}
				{placeholder}
				{disabled}
				value={displayValue}
				oninput={(e) => (displayValue = e.currentTarget.value)}
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

	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{/if}
</Field.Field>
