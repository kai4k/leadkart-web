<!-- src/lib/components/form/Combobox.svelte -->
<!--
	Combobox — typeahead single-select on `ui/popover` + `ui/command` (the shadcn recipe).

	The field is a button with `role="combobox"` (named by the visible label, `aria-expanded`,
	`aria-controls`); it opens a popover whose first control is a filter input (`Command.Input`,
	"Filter options") above a named listbox. Command handles the keyboard: Up/Down moves the
	highlight, Enter selects, Escape closes, typing filters.

	Server-side search: pass `onInput` to receive the typed query and update `options` from the
	parent. The component does not filter when `onInput` is provided; the parent owns the filtering.
	With a `name`, a hidden input carries the value for native form submission.

	Single-select only. Multi-select belongs in a separate primitive when 3+ features need it
	(Rule of Three).
-->
<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ChevronDown, Icon } from '#lib/icons/index.ts';
	import * as Command from '#lib/components/ui/command/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { fieldControlClass } from './field-control.ts';

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
		placeholder,
		loading = false,
		emptyState,
		disabled = false,
		required = false,
		name,
		id,
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `combobox-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const listId = $derived(`${fieldId}-list`);

	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
	);

	let open = $state(false);
	let query = $state('');
	let filterInput = $state<HTMLElement | null>(null);
	// The list mounts two frames after the popover opens. Command scrolls its highlighted item into
	// view the moment it mounts; before floating-ui has placed the popover that item sits at the
	// document's top-left, so mounting early scrolled the whole page to the top.
	let placed = $state(false);
	$effect(() => {
		if (!open) return;
		let second = 0;
		const first = requestAnimationFrame(() => {
			second = requestAnimationFrame(() => (placed = true));
		});
		return () => {
			cancelAnimationFrame(first);
			cancelAnimationFrame(second);
			placed = false;
		};
	});
	$effect(() => {
		if (placed) filterInput?.focus({ preventScroll: true });
	});

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');

	function select(opt: ComboboxOption) {
		value = opt.value;
		onValueChange?.(opt.value);
		open = false;
	}

	function handleOpenChange(next: boolean) {
		open = next;
		// A closed list starts empty next time, so a half-typed query never lingers.
		if (!next) {
			query = '';
			onInput?.('');
		}
	}
</script>

<Field.Field class={className}>
	<Field.Label for={fieldId} class={srLabel ? 'sr-only' : undefined}>{label}</Field.Label>

	<Popover.Root {open} onOpenChange={handleOpenChange}>
		<Popover.Trigger
			id={fieldId}
			role="combobox"
			aria-expanded={open}
			aria-haspopup="listbox"
			aria-controls={listId}
			aria-required={required ? 'true' : undefined}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			{disabled}
			class={cn(fieldControlClass, 'justify-between gap-2 text-start')}
		>
			<span class={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
				{selectedLabel || (placeholder ?? $_('form.combobox.select'))}
			</span>
			<Icon icon={ChevronDown} size="sm" class="shrink-0 text-muted-foreground" />
		</Popover.Trigger>

		<Popover.Content
			align="start"
			class="w-(--bits-popover-anchor-width) min-w-56 gap-0 p-0"
			onOpenAutoFocus={(event) => event.preventDefault()}
		>
			{#if placed}
				<Command.Root shouldFilter={!onInput} class="p-1">
					<Command.Input
						bind:ref={filterInput}
						aria-label={$_('form.combobox.filter')}
						placeholder={$_('form.combobox.search')}
						bind:value={query}
						oninput={() => onInput?.(query)}
					/>
					<Command.List id={listId} aria-label={label}>
						{#if loading}
							<div class="px-3 py-2 text-sm text-muted-foreground">{$_('common.loading')}</div>
						{:else}
							<Command.Empty>{emptyState ?? $_('form.combobox.empty')}</Command.Empty>
							{#each options as opt (opt.value)}
								<Command.Item
									value={opt.value}
									keywords={[opt.label, opt.description ?? '']}
									disabled={opt.disabled}
									data-checked={opt.value === value}
									onSelect={() => select(opt)}
									class="items-start"
								>
									<span class="flex min-w-0 flex-1 flex-col">
										<span>{opt.label}</span>
										{#if opt.description}
											<span class="text-xs text-muted-foreground">{opt.description}</span>
										{/if}
									</span>
								</Command.Item>
							{/each}
						{/if}
					</Command.List>
				</Command.Root>
			{/if}
		</Popover.Content>
	</Popover.Root>

	{#if name}
		<input type="hidden" {name} value={value ?? ''} />
	{/if}

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{/if}
</Field.Field>
