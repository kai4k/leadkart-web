<script lang="ts" module>
	/**
	 * InlineEdit — click-to-edit text cell.
	 *
	 * Industry refs: Linear inline title edit, Notion inline rename,
	 * GitHub repo description edit, Atlassian inline-edit pattern.
	 *
	 * Display state: token-styled text, hover background hint. Activates
	 * an autofocused input on click / Enter / Space, selecting current
	 * text. Enter or blur saves (awaiting onSave); Escape cancels.
	 * Validation hook renders an inline error below.
	 */
</script>

<script lang="ts">
	import { Edit, Icon } from '$lib/icons';
	import { tick } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		value: string;
		onSave: (next: string) => void | Promise<void>;
		placeholder?: string;
		disabled?: boolean;
		validate?: (v: string) => string | null;
		label?: string;
		class?: string;
	};

	let {
		value,
		onSave,
		placeholder = 'Click to edit',
		disabled = false,
		validate,
		label,
		class: className = ''
	}: Props = $props();

	let editing = $state(false);
	let draft = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let inputEl: HTMLInputElement | null = $state(null);

	$effect(() => {
		// Sync external value into draft when not editing
		if (!editing) draft = value;
	});

	async function enter() {
		if (disabled || saving) return;
		draft = value;
		error = null;
		editing = true;
		await tick();
		inputEl?.focus();
		inputEl?.select();
	}

	function cancel() {
		editing = false;
		draft = value;
		error = null;
	}

	async function save() {
		if (saving) return;
		const next = draft.trim();
		if (validate) {
			const v = validate(next);
			if (v) {
				error = v;
				return;
			}
		}
		if (next === value) {
			editing = false;
			error = null;
			return;
		}
		saving = true;
		try {
			await onSave(next);
			editing = false;
			error = null;
		} catch {
			// Primitives don't introspect error shape — the consumer's
			// onSave is responsible for typed-error handling. We surface
			// a generic message so the inline-edit UI doesn't leak wire
			// detail to end users.
			error = 'Could not save';
		} finally {
			saving = false;
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			void save();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancel();
		}
	}

	const displayText = $derived(value.trim() === '' ? placeholder : value);
	const isPlaceholder = $derived(value.trim() === '');
</script>

<div class={cn('inline-block', className)}>
	{#if editing}
		<div class="stack stack-tight">
			<input
				bind:this={inputEl}
				type="text"
				aria-label={label}
				aria-invalid={error ? 'true' : undefined}
				class={cn(
					'bg-bg-elevated border border-border rounded-md body-sm text-fg block w-full px-2 py-1',
					'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
					'disabled:cursor-not-allowed disabled:opacity-60',
					error
						? 'border-danger-500 focus-visible:ring-danger-500'
						: 'focus-visible:ring-focus-ring'
				)}
				value={draft}
				disabled={saving}
				oninput={(e) => (draft = e.currentTarget.value)}
				onblur={() => {
					if (editing) void save();
				}}
				onkeydown={onKeyDown}
			/>
			{#if error}
				<p class="body-sm text-danger-700" role="alert">{error}</p>
			{/if}
		</div>
	{:else}
		<button
			type="button"
			class={cn(
				'group body-sm inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-start',
				'hover:bg-bg-muted',
				'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none',
				'disabled:cursor-not-allowed disabled:opacity-60',
				isPlaceholder ? 'text-fg-subtle italic' : 'text-fg'
			)}
			aria-label={label ?? `Edit ${value}`}
			{disabled}
			onclick={() => void enter()}
		>
			<span class="truncate-1">{displayText}</span>
			<Icon
				icon={Edit}
				size="xs"
				class="text-fg-subtle flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
			/>
		</button>
	{/if}
</div>
