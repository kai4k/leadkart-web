<script lang="ts" module>
	/**
	 * TagInput — chip multi-select with autocomplete.
	 *
	 * Renders an inline cluster of tags and an open-ended input. Comma or Enter commits the input as
	 * a tag; Backspace on an empty input removes the last tag. The input is labelled by the visible
	 * `label` (never by the placeholder).
	 *
	 * Autocomplete: when `suggestions` is provided and the input matches at least one (case-
	 * insensitive substring), a listbox surfaces the options. Arrow keys move the highlight
	 * (`aria-activedescendant`), Enter or a click picks it.
	 */
</script>

<script lang="ts">
	import { Icon, X } from '#lib/icons/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { cn } from '#lib/utils/cn.ts';

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

	const uid = $props.id();
	const fieldId = $derived(id ?? `tag-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const localErrorId = $derived(`${fieldId}-localerror`);
	const listboxId = $derived(`${fieldId}-listbox`);

	let inputText = $state('');
	let focused = $state(false);
	let highlightIndex = $state(0);
	let localError = $state<string | null>(null);
	let inputEl: HTMLInputElement | null = $state(null);

	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null, localError ? localErrorId : null]
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

<Field.Field class={className}>
	<Field.Label for={fieldId} class={srLabel ? 'sr-only' : undefined}>{label}</Field.Label>

	<div class="relative">
		<!-- The frame only forwards a click to the input; the input is the keyboard target. -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class={cn(
				'flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-2 py-1 text-start transition-colors dark:bg-input-fill',
				'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring',
				(error || localError) && 'border-destructive',
				// Not `opacity-50`: it drops the chips' text below AA, which axe cannot excuse inside a div.
				disabled && 'cursor-not-allowed bg-muted'
			)}
			onclick={() => inputEl?.focus()}
		>
			{#each value as tag, i (tag)}
				<Badge variant={disabled ? 'secondary' : 'brand'} class="gap-1 ps-2.5 pe-1">
					<span>{tag}</span>
					<button
						type="button"
						class="inline-flex size-4 items-center justify-center rounded-full hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						aria-label={`Remove ${tag}`}
						onclick={(e) => {
							e.stopPropagation();
							removeTag(i);
						}}
						{disabled}
					>
						<Icon icon={X} size="xs" />
					</button>
				</Badge>
			{/each}

			<Input
				bind:ref={inputEl}
				id={fieldId}
				type="text"
				role="combobox"
				aria-expanded={showDropdown}
				aria-controls={showDropdown ? listboxId : undefined}
				aria-activedescendant={showDropdown ? `${listboxId}-${highlightIndex}` : undefined}
				aria-autocomplete="list"
				aria-invalid={error || localError ? 'true' : undefined}
				aria-describedby={describedBy}
				class="h-auto min-w-24 flex-1 rounded-none border-0 bg-transparent px-1 py-0.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
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
				aria-label={label}
				class="absolute inset-x-0 top-full z-(--z-dropdown) mt-1 max-h-60 overflow-auto rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-border"
			>
				{#each filteredSuggestions as suggestion, i (suggestion)}
					<li
						id="{listboxId}-{i}"
						role="option"
						aria-selected={i === highlightIndex}
						class={cn(
							'cursor-pointer rounded-sm px-3 py-1.5 text-sm',
							i === highlightIndex ? 'bg-muted text-foreground' : 'hover:bg-muted'
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

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{/if}
	{#if localError}
		<Field.Error id={localErrorId}>{localError}</Field.Error>
	{/if}
</Field.Field>
