<!-- src/lib/components/form/Combobox.svelte -->
<!--
	Combobox — typeahead select over bits-ui Combobox.

	bits-ui handles ARIA combobox + listbox semantics, keyboard nav
	(Up/Down to move highlight, Enter to select, Esc to close, typing
	to filter), and floating list positioning. We supply the option-
	filtering logic (client-side, default) and the visual chrome —
	input + chevron + popover list — styled to match TextField + Popover.

	Server-side search: pass `onInput` to receive the typed query, then
	update `options` from the parent. The component does not filter
	when `onInput` is provided — the parent owns the filtering.

	Single-select only. Multi-select belongs in a separate primitive
	when 3+ features need it (Rule of Three).
-->
<script lang="ts">
	import { Combobox as BitsCombobox } from 'bits-ui';
	import { Check, ChevronDown, Icon } from '$lib/icons';
	import { cn } from '$lib/utils/cn';

	export interface ComboboxOption {
		value: string;
		label: string;
		description?: string;
		disabled?: boolean;
	}

	type Props = {
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		options: ReadonlyArray<ComboboxOption>;
		value?: string | null;
		onValueChange?: (value: string) => void;
		onInput?: (query: string) => void;
		placeholder?: string;
		loading?: boolean;
		emptyState?: string;
		disabled?: boolean;
		required?: boolean;
		name?: string;
		id?: string;
		class?: string;
	};

	let {
		label,
		srLabel = false,
		hint,
		error,
		options,
		value = $bindable(null),
		onValueChange,
		onInput,
		placeholder = 'Select…',
		loading = false,
		emptyState = 'No results',
		disabled = false,
		required = false,
		name,
		id,
		class: className = ''
	}: Props = $props();

	const fieldId = $derived(id ?? `combobox-${label.toLowerCase().replace(/\s+/g, '-')}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);

	let query = $state('');
	let open = $state(false);

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');

	// Server-side search mode: parent owns the filtering, we just relay input.
	// Client-side search mode (no onInput): filter locally on the query.
	const filteredOptions = $derived(
		onInput
			? options
			: query.trim() === ''
				? options
				: options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
	);

	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		query = e.currentTarget.value;
		onInput?.(query);
	}

	function handleValueChange(v: string) {
		value = v || null;
		onValueChange?.(v);
		// Sync the input display to the selected label when the popover closes.
		query = options.find((o) => o.value === v)?.label ?? '';
	}

	function handleOpenChange(o: boolean) {
		open = o;
		if (!o) {
			// On close, snap the input back to the selected label so the field
			// doesn't show a stale half-typed query.
			query = selectedLabel;
		} else if (selectedLabel && !query) {
			query = '';
		}
	}
</script>

<div class={cn('stack stack-tight', className)}>
	<label for={fieldId} class={cn('label text-fg', srLabel && 'sr-only')}>
		{label}
	</label>

	<BitsCombobox.Root
		type="single"
		value={value ?? ''}
		onValueChange={handleValueChange}
		bind:open
		onOpenChange={handleOpenChange}
		{disabled}
		{required}
		{name}
	>
		<div class="relative">
			<BitsCombobox.Input
				id={fieldId}
				oninput={handleInput}
				{placeholder}
				aria-invalid={error ? 'true' : undefined}
				aria-describedby={describedBy}
				class={cn(
					'bg-bg-elevated border border-border rounded-md body-sm text-fg block w-full py-2 ps-3 pe-10',
					'placeholder:text-fg-subtle',
					'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
					'disabled:cursor-not-allowed disabled:opacity-60',
					error
						? 'border-danger-500 focus-visible:ring-danger-500'
						: 'focus-visible:ring-focus-ring'
				)}
			/>
			<BitsCombobox.Trigger
				class={cn(
					'text-fg-subtle absolute inset-y-0 end-0 flex items-center pe-3',
					'focus-visible:outline-none'
				)}
				aria-label="Toggle options"
			>
				<Icon icon={ChevronDown} size="sm" />
			</BitsCombobox.Trigger>
		</div>

		<BitsCombobox.Portal>
			<BitsCombobox.Content
				sideOffset={6}
				class={cn(
					'bg-bg-elevated border border-border rounded-xl shadow-card z-popover',
					'max-h-60 min-w-[var(--bits-combobox-anchor-width)] overflow-y-auto rounded-xl p-1',
					'border border-[var(--glass-border-subtle)]',
					'shadow-[var(--glass-shadow-sm)]',
					'data-[state=open]:animate-pop-in data-[state=closed]:animate-fade-out'
				)}
			>
				{#if loading}
					<div class="body-sm text-fg-muted px-3 py-2">Loading…</div>
				{:else if filteredOptions.length === 0}
					<div class="body-sm text-fg-muted px-3 py-2">{emptyState}</div>
				{:else}
					{#each filteredOptions as opt (opt.value)}
						<BitsCombobox.Item
							value={opt.value}
							label={opt.label}
							disabled={opt.disabled}
							class={cn(
								'flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-sm outline-none',
								'transition-colors duration-[var(--duration-fast)]',
								'text-fg',
								'data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-600',
								'data-[disabled]:pointer-events-none data-[disabled]:opacity-40'
							)}
						>
							{#snippet children({ selected }: { selected: boolean })}
								<span class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center">
									{#if selected}
										<Icon icon={Check} size="xs" class="text-primary" />
									{/if}
								</span>
								<span class="flex min-w-0 flex-col">
									<span>{opt.label}</span>
									{#if opt.description}
										<span class="caption text-fg-muted">{opt.description}</span>
									{/if}
								</span>
							{/snippet}
						</BitsCombobox.Item>
					{/each}
				{/if}
			</BitsCombobox.Content>
		</BitsCombobox.Portal>
	</BitsCombobox.Root>

	{#if hint && !error}
		<p id={hintId} class="caption">{hint}</p>
	{/if}

	{#if error}
		<p id={errorId} class="body-sm text-danger-700">{error}</p>
	{/if}
</div>
