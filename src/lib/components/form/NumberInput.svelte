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
	import { Icon, Minus, Plus } from '$lib/icons';
	import { cn } from '$lib/utils/cn';

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

	const fieldId = $derived(id ?? `number-${label.toLowerCase().replace(/\s+/g, '-')}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
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

<div class={cn('stack stack-tight', className)}>
	<label for={fieldId} class={cn('label text-fg', srLabel && 'sr-only')}>
		{label}
	</label>

	<div class="flex items-stretch gap-1">
		<button
			type="button"
			class={cn(
				'glass-input flex items-center justify-center px-2',
				'text-fg-muted hover:text-fg',
				'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none',
				'disabled:cursor-not-allowed disabled:opacity-40'
			)}
			aria-label="Decrement"
			disabled={disabled || isAtMin}
			onclick={() => nudge(-step)}
			tabindex="-1"
		>
			<Icon icon={Minus} size="sm" />
		</button>

		<div class="relative flex-1">
			{#if prefix}
				<span
					class="text-fg-subtle body-sm pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3"
					aria-hidden="true"
				>
					{prefix}
				</span>
			{/if}

			<input
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
				class={cn(
					'glass-input body-sm text-fg block w-full px-3 py-2 text-center tabular-nums',
					'placeholder:text-fg-subtle',
					'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
					'disabled:cursor-not-allowed disabled:opacity-60',
					error
						? 'border-danger-500 focus-visible:ring-danger-500'
						: 'focus-visible:ring-focus-ring',
					prefix && 'ps-7',
					suffix && 'pe-7'
				)}
			/>

			{#if suffix}
				<span
					class="text-fg-subtle body-sm pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3"
					aria-hidden="true"
				>
					{suffix}
				</span>
			{/if}
		</div>

		<button
			type="button"
			class={cn(
				'glass-input flex items-center justify-center px-2',
				'text-fg-muted hover:text-fg',
				'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none',
				'disabled:cursor-not-allowed disabled:opacity-40'
			)}
			aria-label="Increment"
			disabled={disabled || isAtMax}
			onclick={() => nudge(step)}
			tabindex="-1"
		>
			<Icon icon={Plus} size="sm" />
		</button>
	</div>

	{#if hint && !error}
		<p id={hintId} class="caption">{hint}</p>
	{/if}

	{#if error}
		<p id={errorId} class="body-sm text-danger-700">{error}</p>
	{/if}
</div>
