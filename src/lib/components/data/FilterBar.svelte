<!-- src/lib/components/data/FilterBar.svelte -->
<script lang="ts" module>
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
	 *   toggles and keeps the list open, so several can be picked in a row.
	 * - `date-range`: `DateRangePicker` (typed or picked); the URL keys are `{key}_from` and `{key}_to`,
	 *   written together in ONE navigation.
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

	function multiValueOf(key: string): string[] {
		const v = urlFilters.filters[key as keyof TFilters];
		return Array.isArray(v) ? v : [];
	}

	function setScalar(key: string, value: string) {
		urlFilters.setFilter(key as Key, value as Value);
	}

	function toggleMulti(key: string, value: string) {
		const current = multiValueOf(key);
		const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
		urlFilters.setFilter(key as Key, next as unknown as Value);
	}

	function setRange(key: string, range: { start: string; end: string }) {
		urlFilters.setMany({
			[`${key}_from`]: range.start,
			[`${key}_to`]: range.end
		} as Partial<TFilters>);
	}

	function rangeOf(key: string): { start: string; end: string } {
		return { start: valueOf(`${key}_from`), end: valueOf(`${key}_to`) };
	}
</script>

{#snippet multiSelect(field: FilterBarField)}
	{@const chosen = multiValueOf(field.key)}
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
					<Command.List aria-label={field.label}>
						<Command.Empty>{$_('form.combobox.empty')}</Command.Empty>
						{#each field.options ?? [] as opt (opt.value)}
							{@const on = chosen.includes(opt.value)}
							<Command.Item
								value={opt.value}
								keywords={[opt.label]}
								data-checked={on}
								onSelect={() => toggleMulti(field.key, opt.value)}
							>
								<span class="flex min-w-0 flex-1 items-center gap-2">
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
									{#if on}<span class="sr-only">{$_('form.combobox.selected')}</span>{/if}
								</span>
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
