<script lang="ts" module>
	/**
	 * TagInput — chip multi-select with autocomplete.
	 *
	 * Renders an inline cluster of tags and an open-ended input. Comma or Enter commits the input as
	 * a tag; Backspace on an empty input removes the last tag. The input is labelled by the visible
	 * `label` (never by the placeholder).
	 *
	 * Nothing typed is lost: text still in the input is committed when the field is left and again just
	 * before the form is submitted; a comma or a line break is a separator wherever it arrives (an
	 * Android keyboard reports `key = Unidentified`, so the input event, not the key, is what splits), so
	 * a pasted "Tablet, Syrup, Capsule" becomes three tags; tags are unique ignoring case. Text that
	 * cannot become a tag (a refused name, the maximum) stays in the field, says why, and blocks the
	 * submit (`data-unreadable`), instead of being dropped.
	 *
	 * Autocomplete: when `suggestions` is provided and the input matches at least one (case-
	 * insensitive substring), a listbox surfaces the options. Arrow keys move the highlight
	 * (`aria-activedescendant`), Enter or a click picks it.
	 */
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
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
		/** Visible required mark and `aria-required`; whether zero tags are refused is the form's rule. */
		required?: boolean;
		/** The API field this input is for: a server error on it lands here (the form looks for `[name]`). */
		name?: string;
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
		required = false,
		name,
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
		[error ? errorId : null, localError ? localErrorId : null, hint ? hintId : null]
			.filter(Boolean)
			.join(' ') || undefined
	);

	const filteredSuggestions = $derived.by(() => {
		const q = inputText.trim().toLowerCase();
		if (!q) return [];
		return suggestions.filter((s) => s.toLowerCase().includes(q) && !has(value, s)).slice(0, 8);
	});

	const showDropdown = $derived(focused && filteredSuggestions.length > 0);

	/** Tags are unique ignoring case ("Tablet", "tablet" and "TABLET" are one). */
	function has(tags: string[], tag: string): boolean {
		const key = tag.toLowerCase();
		return tags.some((t) => t.toLowerCase() === key);
	}

	const SEPARATOR = /[,\n\r]/;
	const splitTags = (text: string) => text.split(SEPARATOR);

	/**
	 * Adds each piece in turn. Returns the text that could NOT become a tag ('' when all did): the
	 * caller keeps it in the input with the reason in `localError`, it is never dropped.
	 */
	function addAll(raws: string[]): string {
		let next = value;
		let rest = '';
		for (let i = 0; i < raws.length; i++) {
			const tag = (raws[i] ?? '').trim();
			if (!tag || has(next, tag)) continue;
			if (maxTags !== undefined && next.length >= maxTags) {
				localError = $_('form.tags.max', { values: { max: maxTags } });
				rest = raws.slice(i).join(', ');
				break;
			}
			const refused = validateTag?.(tag);
			if (refused) {
				localError = refused;
				rest = raws.slice(i).join(', ');
				break;
			}
			next = [...next, tag];
		}
		if (next !== value) value = next;
		if (rest === '') localError = null;
		highlightIndex = 0;
		return rest;
	}

	function commitTag(raw: string) {
		inputText = addAll([raw]);
	}

	/** Whatever is still typed becomes tags (leaving the field, submitting). */
	function flush() {
		if (inputText.trim() === '') {
			inputText = '';
			return;
		}
		inputText = addAll(splitTags(inputText));
	}

	// The form may be submitted without this field ever losing focus (a button elsewhere, Ctrl+Enter):
	// what is typed becomes tags first. Capture phase: before the form's own submit handler reads the value.
	$effect(() => {
		const form = inputEl?.form;
		if (!form) return;
		form.addEventListener('submit', flush, true);
		return () => form.removeEventListener('submit', flush, true);
	});

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

	// How the last text arrived: a paste or drop is a whole list (its last piece is a tag too); typing is
	// still being written (the piece after the last separator is the next tag, in progress).
	let lastInputType = '';
	function onInput(e: Event) {
		lastInputType = (e as InputEvent).inputType ?? '';
		highlightIndex = 0;
		localError = null;
	}

	// A separator arrived without a key event we can read (Android reports key = Unidentified; a paste; a
	// drop): split here, whichever listener saw the input first.
	$effect(() => {
		const typed = inputText;
		if (!SEPARATOR.test(typed)) return;
		untrack(() => {
			const parts = splitTags(typed);
			const whole = /^insertFrom(Paste|Drop)/.test(lastInputType);
			const remainder = whole ? '' : (parts.pop() ?? '');
			const unadded = addAll(parts);
			inputText = [unadded, remainder].filter(Boolean).join(', ');
		});
	});
</script>

<Field.Field class={className}>
	<Field.Label for={fieldId} {required} class={srLabel ? 'sr-only' : undefined}>
		{label}
	</Field.Label>

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
						aria-label={$_('form.tags.remove', { values: { tag } })}
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
				{name}
				type="text"
				role="combobox"
				aria-expanded={showDropdown}
				aria-controls={showDropdown ? listboxId : undefined}
				aria-activedescendant={showDropdown ? `${listboxId}-${highlightIndex}` : undefined}
				aria-autocomplete="list"
				aria-required={required ? 'true' : undefined}
				data-unreadable={localError && inputText.trim() !== '' ? 'true' : undefined}
				aria-invalid={error || localError ? 'true' : undefined}
				aria-describedby={describedBy}
				class="h-auto min-w-24 flex-1 rounded-none border-0 bg-transparent px-1 py-0.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
				placeholder={value.length === 0 ? placeholder : ''}
				{disabled}
				bind:value={inputText}
				oninput={onInput}
				onfocus={() => (focused = true)}
				onblur={() => {
					flush();
					setTimeout(() => (focused = false), 150);
				}}
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
						data-active={i === highlightIndex}
						class={cn(
							'item-highlight cursor-pointer rounded-sm px-3 py-1.5 text-sm',
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
