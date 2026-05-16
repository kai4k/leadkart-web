<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { ChevronDown } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';

	/**
	 * Select — labelled native-<select> primitive. Mirrors TextField's
	 * surface (label / srLabel / hint / error) so feature forms can
	 * reach for either without learning two APIs.
	 *
	 * Why native <select> over bits-ui Select:
	 *   - Free a11y (role=combobox, aria-expanded, listbox semantics
	 *     baked into the browser).
	 *   - Free keyboard navigation (arrow keys, type-to-jump,
	 *     Home / End).
	 *   - Native mobile picker UX — drum-wheel on iOS, native dropdown
	 *     on Android.
	 *   - No bundle weight beyond this wrapper.
	 *
	 * Custom-styled dropdowns (rich items, images, multi-line) belong
	 * in a separate ComboBox primitive built on bits-ui — extract when
	 * 3 features need it. Token-styled chrome here keeps it close to
	 * the TextField visual treatment without fighting platform-default
	 * dropdown rendering.
	 */

	export interface SelectOption {
		value: string;
		label: string;
	}

	type Props = Omit<HTMLSelectAttributes, 'class' | 'value'> & {
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
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
		id,
		value = $bindable(''),
		options,
		placeholder,
		class: className = '',
		...rest
	}: Props = $props();

	const fieldId = $derived(id ?? `select-${label.toLowerCase().replace(/\s+/g, '-')}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={cn('stack stack-tight', className)}>
	<label for={fieldId} class={cn('label text-[var(--color-fg)]', srLabel && 'sr-only')}>
		{label}
	</label>

	<div class="relative">
		<select
			id={fieldId}
			bind:value
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			class={cn(
				'glass-input body-sm block w-full appearance-none px-3 py-2 pr-10 text-[var(--color-fg)]',
				'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
				error
					? 'border-[var(--color-danger-500)] focus-visible:ring-[var(--color-danger-500)]'
					: 'focus-visible:ring-[var(--color-focus-ring)]',
				'disabled:cursor-not-allowed disabled:opacity-60'
			)}
			{...rest}
		>
			{#if placeholder}
				<option value="" disabled selected={!value}>{placeholder}</option>
			{/if}
			{#each options as opt (opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>

		<span
			class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-fg-subtle)]"
			aria-hidden="true"
		>
			<ChevronDown size={16} />
		</span>
	</div>

	{#if hint && !error}
		<p id={hintId} class="caption">{hint}</p>
	{/if}

	{#if error}
		<p id={errorId} class="body-sm text-[var(--color-danger-700)]">
			{error}
		</p>
	{/if}
</div>
