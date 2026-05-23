<script lang="ts" module>
	/**
	 * TagInput — chip multi-select with autocomplete.
	 *
	 * Industry refs: Linear labels picker, Notion multi-select, GitHub Primer
	 * AutoComplete, react-tag-input. Renders an inline pill cluster + an
	 * open-ended input. Comma or Enter commits the input as a new pill;
	 * Backspace on empty input removes the last pill.
	 *
	 * Autocomplete: when `suggestions` is provided and the input matches at
	 * least one suggestion (case-insensitive substring), a portal-free
	 * dropdown surfaces options. Click or Enter picks the highlighted item.
	 */
</script>

<script lang="ts">
	import { Icon, X } from '$lib/icons';
	import { cn } from '$lib/utils/cn';

	type Props = {
		value: string[];
		placeholder?: string;
		suggestions?: string[];
		disabled?: boolean;
		maxTags?: number;
		validateTag?: (tag: string) => string | null;
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		id?: string;
		class?: string;
	};

	let {
		value = $bindable([]),
		placeholder,
		suggestions = [],
		disabled = false,
		maxTags,
		validateTag,
		label,
		srLabel = false,
		hint,
		error,
		id,
		class: className = ''
	}: Props = $props();

	const fieldId = $derived(id ?? `tag-${label.toLowerCase().replace(/\s+/g, '-')}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const listboxId = $derived(`${fieldId}-listbox`);

	let inputText = $state('');
	let focused = $state(false);
	let highlightIndex = $state(0);
	let localError = $state<string | null>(null);
	let inputEl: HTMLInputElement | null = $state(null);

	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null, localError ? `${fieldId}-localerror` : null]
			.filter(Boolean)
			.join(' ') || undefined
	);

	const atMax = $derived(maxTags !== undefined && value.length >= maxTags);

	const filteredSuggestions = $derived.by(() => {
		const q = inputText.trim().toLowerCase();
		if (!q) return [];
		return suggestions.filter((s) => s.toLowerCase().includes(q) && !value.includes(s)).slice(0, 8);
	});

	const showDropdown = $derived(focused && filteredSuggestions.length > 0);

	function commitTag(raw: string) {
		const tag = raw.trim();
		if (!tag) return;
		if (value.includes(tag)) {
			inputText = '';
			return;
		}
		if (atMax) {
			localError = `Maximum ${maxTags} tags`;
			return;
		}
		if (validateTag) {
			const v = validateTag(tag);
			if (v) {
				localError = v;
				return;
			}
		}
		value = [...value, tag];
		inputText = '';
		localError = null;
		highlightIndex = 0;
	}

	function removeTag(idx: number) {
		value = value.filter((_, i) => i !== idx);
		localError = null;
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			if (showDropdown) {
				commitTag(filteredSuggestions[highlightIndex] ?? inputText);
			} else {
				commitTag(inputText);
			}
		} else if (e.key === 'Backspace' && inputText === '' && value.length > 0) {
			removeTag(value.length - 1);
		} else if (e.key === 'ArrowDown' && showDropdown) {
			e.preventDefault();
			highlightIndex = Math.min(highlightIndex + 1, filteredSuggestions.length - 1);
		} else if (e.key === 'ArrowUp' && showDropdown) {
			e.preventDefault();
			highlightIndex = Math.max(highlightIndex - 1, 0);
		} else if (e.key === 'Escape') {
			focused = false;
		}
	}

	function onInput(e: Event) {
		inputText = (e.target as HTMLInputElement).value;
		highlightIndex = 0;
		localError = null;
	}
</script>

<div class={cn('stack stack-tight', className)}>
	<label for={fieldId} class={cn('label text-fg', srLabel && 'sr-only')}>
		{label}
	</label>

	<div class="relative">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class={cn(
				'glass-input body-sm flex w-full flex-wrap items-center gap-2 px-2 py-1.5 text-left',
				'focus-within:ring-2 focus-within:ring-offset-1 focus-within:outline-none',
				disabled && 'is-disabled',
				error || localError
					? 'border-danger-500 focus-within:ring-danger-500'
					: 'focus-within:ring-focus-ring'
			)}
			onclick={() => inputEl?.focus()}
		>
			{#each value as tag, i (tag)}
				<span
					class="bg-primary-soft text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
				>
					<span>{tag}</span>
					<button
						type="button"
						class="hover:text-primary-active rounded-full"
						aria-label={`Remove ${tag}`}
						onclick={(e) => {
							e.stopPropagation();
							removeTag(i);
						}}
						{disabled}
					>
						<Icon icon={X} size="xs" />
					</button>
				</span>
			{/each}

			<input
				bind:this={inputEl}
				id={fieldId}
				type="text"
				role="combobox"
				aria-expanded={showDropdown}
				aria-controls={listboxId}
				aria-autocomplete="list"
				aria-invalid={error || localError ? 'true' : undefined}
				aria-describedby={describedBy}
				class={cn(
					'body-sm text-fg placeholder:text-fg-subtle min-w-[6rem] flex-1 bg-transparent px-1 py-0.5',
					'focus:outline-none'
				)}
				placeholder={value.length === 0 ? placeholder : ''}
				{disabled}
				value={inputText}
				oninput={onInput}
				onfocus={() => (focused = true)}
				onblur={() => setTimeout(() => (focused = false), 150)}
				onkeydown={onKeyDown}
			/>
		</div>

		{#if showDropdown}
			<ul
				id={listboxId}
				role="listbox"
				class={cn(
					'glass-card z-dropdown absolute top-full right-0 left-0 mt-1 max-h-60 overflow-auto p-1'
				)}
			>
				{#each filteredSuggestions as suggestion, i (suggestion)}
					<li
						role="option"
						aria-selected={i === highlightIndex}
						class={cn(
							'body-sm cursor-pointer rounded-md px-3 py-1.5',
							i === highlightIndex ? 'bg-primary-soft text-primary' : 'text-fg hover:bg-bg-muted'
						)}
						onmousedown={(e) => {
							e.preventDefault();
							commitTag(suggestion);
						}}
						onmouseenter={() => (highlightIndex = i)}
					>
						{suggestion}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if hint && !error && !localError}
		<p id={hintId} class="caption">{hint}</p>
	{/if}

	{#if error}
		<p id={errorId} class="body-sm text-danger-700">{error}</p>
	{:else if localError}
		<p id="{fieldId}-localerror" class="body-sm text-danger-700">{localError}</p>
	{/if}
</div>
