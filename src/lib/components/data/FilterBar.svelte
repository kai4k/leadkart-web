<!-- src/lib/components/data/FilterBar.svelte -->
<script lang="ts" module>
	import { isDateOnly } from '#lib/utils/date-only.ts';

	export type FilterBarFieldType = 'select' | 'multi-select' | 'text' | 'date-range' | 'boolean';

	export interface FilterBarOption {
		value: string;
		label: string;
	}

	export interface FilterBarField {
		key: string;
		label: string;
		type: FilterBarFieldType;
		/** Required for `select` / `multi-select`. */
		options?: FilterBarOption[];
		/** Optional placeholder for `text` fields. */
		placeholder?: string;
	}

	/**
	 * What the URL may hold for these fields: a listed option, a real calendar date, `true`. Pass it to
	 * `createUrlFilters(schema, { accept: filterAccept(fields) })`: a hand-edited `?status=bogus` or
	 * `?placed_from=notadate` is then read as absent, so it is never shown and never sent to the API.
	 */
	export function filterAccept(
		fields: FilterBarField[]
	): Record<string, (value: string) => boolean> {
		const accept: Record<string, (value: string) => boolean> = {};
		for (const field of fields) {
			if (field.type === 'date-range') {
				accept[`${field.key}_from`] = isDateOnly;
				accept[`${field.key}_to`] = isDateOnly;
			} else if ((field.type === 'select' || field.type === 'multi-select') && field.options) {
				const values = new Set(field.options.map((o) => o.value));
				accept[field.key] = (value) => values.has(value);
			} else if (field.type === 'boolean') {
				accept[field.key] = (value) => value === 'true';
			}
		}
		return accept;
	}
</script>

<script lang="ts" generics="TFilters extends import('#lib/hooks/index.ts').UrlFiltersBase">
	import { _ } from 'svelte-i18n';
	import type { UrlFilters } from '#lib/hooks/index.ts';
	import { Select, TextField, DateRangePicker } from '#lib/components/form/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import * as Command from '#lib/components/ui/command/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { Check, ChevronDown, ChevronUp, Icon } from '#lib/icons/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * FilterBar — collapsible grid of filter controls wired to a `UrlFilters` instance; the URL stays
	 * the single source of truth, so every change is one `urlFilters` call.
	 *
	 * - `select`: the labelled native `Select` field.
	 * - `multi-select`: a popover with a filterable checklist (`Popover` + `Command`). The trigger is
	 *   named after the field and says how many are chosen; an option is a `role="option"` row that
	 *   toggles and keeps the list open, so several can be picked in a row. `aria-selected` is the
	 *   CHOSEN state (the highlighted option is the `aria-activedescendant` of the input); a value that
	 *   is no option is not counted and is dropped on the next pick.
	 * - `date-range`: `DateRangePicker` (typed or picked); the URL keys are `{key}_from` and `{key}_to`,
	 *   written together in ONE navigation. A URL value that is no calendar date is not handed to the picker.
	 * - `text`: `TextField`. `boolean`: a checkbox.
	 */

	type Props = {
		fields: FilterBarField[];
		urlFilters: UrlFilters<TFilters>;
		/** Externally controlled open/close state. */
		open?: boolean;
		class?: string;
	};

	let { fields, urlFilters, open = $bindable(false), class: className = '' }: Props = $props();

	type Key = keyof TFilters & string;
	type Value = TFilters[Key];

	function valueOf(key: string): string {
		const v = urlFilters.filters[key as keyof TFilters];
		return typeof v === 'string' ? v : '';
	}

	/** The chosen values that are options of the field: an unknown value in the URL is not a choice. */
	function multiValueOf(field: FilterBarField): string[] {
		const v = urlFilters.filters[field.key as keyof TFilters];
		const known = new Set((field.options ?? []).map((o) => o.value));
		return Array.isArray(v) ? v.filter((value) => known.has(value)) : [];
	}

	function setScalar(key: string, value: string) {
		urlFilters.setFilter(key as Key, value as Value);
	}

	function toggleMulti(field: FilterBarField, value: string) {
		const current = multiValueOf(field);
		const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
		urlFilters.setFilter(field.key as Key, next as unknown as Value);
	}

	function setRange(key: string, range: { start: string; end: string }) {
		urlFilters.setMany({
			[`${key}_from`]: range.start,
			[`${key}_to`]: range.end
		} as Partial<TFilters>);
	}

	// A URL value that is no calendar date (`notadate`, `2026-02-30`) is no date for the picker either.
	const dateOf = (key: string): string => {
		const v = valueOf(key);
		return isDateOnly(v) ? v : '';
	};
	function rangeOf(key: string): { start: string; end: string } {
		return { start: dateOf(`${key}_from`), end: dateOf(`${key}_to`) };
	}
</script>

{#snippet multiSelect(field: FilterBarField)}
	{@const chosen = multiValueOf(field)}
	<div class="stack stack-tight">
		<span class="label text-foreground" id="filterbar-{field.key}-label">{field.label}</span>
		<Popover.Root>
			<Popover.Trigger
				id="filterbar-{field.key}"
				aria-labelledby="filterbar-{field.key}-label filterbar-{field.key}"
				class="border-input bg-card text-foreground focus-visible:ring-ring inline-flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 text-start text-sm outline-none focus-visible:ring-3"
			>
				<span class="truncate">
					{chosen.length > 0
						? $_('dataList.filterCount', { values: { count: chosen.length } })
						: $_('common.filter.any')}
				</span>
				<Icon icon={ChevronDown} size="sm" class="text-muted-foreground shrink-0" />
			</Popover.Trigger>
			<Popover.Content align="start" class="w-(--bits-popover-anchor-width) min-w-56 gap-0 p-0">
				<Command.Root class="p-1">
					<Command.Input
						aria-label={$_('form.combobox.filter')}
						placeholder={$_('form.combobox.search')}
					/>
					<Command.List aria-label={field.label} aria-multiselectable="true">
						<Command.Empty>{$_('form.combobox.empty')}</Command.Empty>
						{#each field.options ?? [] as opt (opt.value)}
							{@const on = chosen.includes(opt.value)}
							<Command.Item
								value={opt.value}
								keywords={[opt.label]}
								onSelect={() => toggleMulti(field, opt.value)}
							>
								<!-- bits-ui writes aria-selected for the HIGHLIGHTED item; in a checklist it must say CHOSEN. -->
								{#snippet child({ props })}
									<div {...props} aria-selected={on}>
										<span
											class={cn(
												'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
												on
													? 'bg-primary-indicator border-primary-indicator text-primary-indicator-foreground'
													: 'border-input'
											)}
											aria-hidden="true"
										>
											{#if on}<Icon icon={Check} size="xs" />{/if}
										</span>
										<span>{opt.label}</span>
									</div>
								{/snippet}
							</Command.Item>
						{/each}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</div>
{/snippet}

{#if open}
	<div class={cn('border-border bg-card stack stack-tight rounded-md border p-4', className)}>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each fields as field (field.key)}
				{#if field.type === 'select' && field.options}
					<Select
						label={field.label}
						value={valueOf(field.key)}
						placeholder={$_('common.filter.any')}
						options={field.options}
						onchange={(e) => setScalar(field.key, (e.currentTarget as HTMLSelectElement).value)}
					/>
				{:else if field.type === 'multi-select' && field.options}
					{@render multiSelect(field)}
				{:else if field.type === 'text'}
					<TextField
						label={field.label}
						value={valueOf(field.key)}
						placeholder={field.placeholder}
						oninput={(e) => setScalar(field.key, (e.currentTarget as HTMLInputElement).value)}
					/>
				{:else if field.type === 'date-range'}
					<DateRangePicker
						label={field.label}
						valueString={rangeOf(field.key)}
						onValueStringChange={(v) => setRange(field.key, v)}
					/>
				{:else if field.type === 'boolean'}
					<div class="flex items-center gap-2">
						<Checkbox
							id="filterbar-{field.key}"
							checked={valueOf(field.key) === 'true'}
							onCheckedChange={(checked) => setScalar(field.key, checked ? 'true' : '')}
						/>
						<Label for="filterbar-{field.key}">{field.label}</Label>
					</div>
				{/if}
			{/each}
		</div>

		<div class="cluster cluster-spread pt-2">
			<Button variant="ghost" size="sm" onclick={() => (open = false)}>
				<Icon icon={ChevronUp} size="xs" />
				{$_('dataList.hideFilters')}
			</Button>
			<Button variant="ghost" size="sm" onclick={() => urlFilters.clearAll()}>
				{$_('dataList.resetFilters')}
			</Button>
		</div>
	</div>
{:else}
	<Button
		variant="ghost"
		size="sm"
		class={cn('self-start', className)}
		onclick={() => (open = true)}
	>
		<Icon icon={ChevronDown} size="xs" />
		{$_('dataList.showFilters')}
	</Button>
{/if}
