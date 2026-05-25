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

<script lang="ts" generics="TFilters extends import('$lib/hooks').UrlFiltersBase">
	import type { UseUrlFilters } from '$lib/hooks';
	import { Select, TextField } from '$form';
	import { Icon, ChevronDown, ChevronUp } from '$icons';
	import { cn } from '$lib/utils/cn';

	/**
	 * FilterBar — collapsible grid of filter controls wired to a
	 * `UseUrlFilters` instance. Each field's `onchange` calls
	 * `urlFilters.setFilter(...)` so the URL is the single source of
	 * truth.
	 *
	 * Multi-select renders as a grouped `<select multiple>` (native
	 * keyboard + screen-reader behaviour) — when Batch A ships the
	 * Combobox primitive this will swap to a popover multi-select
	 * without changing the consumer API.
	 *
	 * Date-range is a placeholder pair of `<input type="date">` until
	 * Batch A's DatePicker lands; the URL representation is two
	 * separate keys: `{baseKey}_from` + `{baseKey}_to`.
	 */

	type Props = {
		fields: FilterBarField[];
		urlFilters: UseUrlFilters<TFilters>;
		/** Externally controlled open/close state. */
		open?: boolean;
		class?: string;
	};

	let { fields, urlFilters, open = $bindable(false), class: className = '' }: Props = $props();

	function valueOf(key: string): string {
		const v = urlFilters.filters[key as keyof TFilters];
		return typeof v === 'string' ? v : '';
	}

	function multiValueOf(key: string): string[] {
		const v = urlFilters.filters[key as keyof TFilters];
		return Array.isArray(v) ? v : [];
	}

	function dateValueOf(key: string, suffix: 'from' | 'to'): string {
		const v = urlFilters.filters[`${key}_${suffix}` as keyof TFilters];
		return typeof v === 'string' ? v : '';
	}

	function setScalar(key: string, value: string) {
		urlFilters.setFilter(
			key as keyof TFilters & string,
			value as TFilters[keyof TFilters & string]
		);
	}

	function setMulti(key: string, values: string[]) {
		urlFilters.setFilter(
			key as keyof TFilters & string,
			values as unknown as TFilters[keyof TFilters & string]
		);
	}

	function setBoolean(key: string, checked: boolean) {
		urlFilters.setFilter(
			key as keyof TFilters & string,
			(checked ? 'true' : '') as TFilters[keyof TFilters & string]
		);
	}

	function onMultiChange(key: string, event: Event) {
		const sel = event.currentTarget as HTMLSelectElement;
		const values: string[] = [];
		for (const opt of sel.selectedOptions) values.push(opt.value);
		setMulti(key, values);
	}
</script>

{#if open}
	<div
		class={cn('border-border bg-bg-elevated stack stack-tight rounded-md border p-4', className)}
	>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each fields as field (field.key)}
				{#if field.type === 'select' && field.options}
					<Select
						label={field.label}
						value={valueOf(field.key)}
						placeholder="Any"
						options={field.options}
						onchange={(e) => setScalar(field.key, (e.currentTarget as HTMLSelectElement).value)}
					/>
				{:else if field.type === 'multi-select' && field.options}
					<div class="stack stack-tight">
						<label class="label text-fg" for="filterbar-{field.key}">{field.label}</label>
						<select
							id="filterbar-{field.key}"
							multiple
							class="glass-input body-sm text-fg min-h-24 w-full rounded-md px-3 py-2"
							value={multiValueOf(field.key)}
							onchange={(e) => onMultiChange(field.key, e)}
						>
							{#each field.options as opt (opt.value)}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>
				{:else if field.type === 'text'}
					<TextField
						label={field.label}
						value={valueOf(field.key)}
						placeholder={field.placeholder}
						oninput={(e) => setScalar(field.key, (e.currentTarget as HTMLInputElement).value)}
					/>
				{:else if field.type === 'date-range'}
					<div class="stack stack-tight">
						<span class="label text-fg">{field.label}</span>
						<div class="cluster cluster-tight">
							<input
								type="date"
								aria-label="{field.label} from"
								class="glass-input body-sm text-fg flex-1 rounded-md px-3 py-2"
								value={dateValueOf(field.key, 'from')}
								onchange={(e) =>
									setScalar(`${field.key}_from`, (e.currentTarget as HTMLInputElement).value)}
							/>
							<span class="caption text-fg-muted" aria-hidden="true">—</span>
							<input
								type="date"
								aria-label="{field.label} to"
								class="glass-input body-sm text-fg flex-1 rounded-md px-3 py-2"
								value={dateValueOf(field.key, 'to')}
								onchange={(e) =>
									setScalar(`${field.key}_to`, (e.currentTarget as HTMLInputElement).value)}
							/>
						</div>
					</div>
				{:else if field.type === 'boolean'}
					<label class="cluster cluster-tight body-sm text-fg cursor-pointer">
						<input
							type="checkbox"
							class="text-primary focus-visible:ring-focus-ring h-4 w-4 rounded"
							checked={valueOf(field.key) === 'true'}
							onchange={(e) => setBoolean(field.key, (e.currentTarget as HTMLInputElement).checked)}
						/>
						<span>{field.label}</span>
					</label>
				{/if}
			{/each}
		</div>

		<div class="cluster cluster-spread pt-2">
			<button
				type="button"
				class="label text-fg-muted hover:text-fg inline-flex items-center gap-1"
				onclick={() => (open = false)}
			>
				<Icon icon={ChevronUp} size="xs" /> Hide filters
			</button>
			<button
				type="button"
				class="label text-fg-muted hover:text-fg"
				onclick={() => urlFilters.clearAll()}
			>
				Reset filters
			</button>
		</div>
	</div>
{:else}
	<button
		type="button"
		class={cn(
			'label text-fg-muted hover:text-fg inline-flex items-center gap-1 self-start',
			className
		)}
		onclick={() => (open = true)}
	>
		<Icon icon={ChevronDown} size="xs" /> Show filters
	</button>
{/if}
