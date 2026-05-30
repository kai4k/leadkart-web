<!-- src/lib/components/data/ResourceListPage.svelte -->
<script lang="ts" module>
	import type { Component, Snippet } from 'svelte';
	import type { BulkAction } from './BulkActionBar.svelte';
	import type { FilterBarField } from './FilterBar.svelte';

	export interface ResourceListAction {
		label: string;
		icon?: Component;
		onClick: () => void;
		disabled?: boolean;
	}
</script>

<script
	lang="ts"
	generics="TFilters extends import('$lib/hooks').UrlFiltersBase, TItem extends import('$lib/hooks').SelectableItem"
>
	import type { UrlFilters, BulkSelection, SavedViews } from '$lib/hooks';
	import { Button } from '$ui';
	import { Icon } from '$icons';
	import { cn } from '$lib/utils/cn';
	import Toolbar from './Toolbar.svelte';
	import FilterBar from './FilterBar.svelte';
	import FilterChips from './FilterChips.svelte';
	import BulkActionBar from './BulkActionBar.svelte';

	/**
	 * ResourceListPage — page-level template composing every primitive
	 * in this folder: title row, toolbar, saved-view tabs, filter
	 * drawer, filter chips, list body, sticky bulk-action bar.
	 *
	 * Renders nothing the consumer can't also assemble by hand — the
	 * point is to remove ~600 lines of boilerplate from each list
	 * page. When a consumer needs unusual layout (e.g. a kanban
	 * board), opt out and compose the primitives directly.
	 */

	type Props = {
		title: string;
		subtitle?: string;
		primaryAction?: ResourceListAction;
		secondaryActions?: ResourceListAction[];
		savedViews?: SavedViews<TFilters>;
		filters?: {
			config: FilterBarField[];
			instance: UrlFilters<TFilters>;
		};
		bulk?: {
			selection: BulkSelection<TItem>;
			actions: BulkAction[];
		};
		/** Optional search-box snippet rendered into the toolbar centre. */
		search?: Snippet;
		/** Body slot — the actual list / kanban / grid. */
		children: Snippet;
		/** Optional footer (e.g. pagination, total counts). */
		footer?: Snippet;
		class?: string;
	};

	let {
		title,
		subtitle,
		primaryAction,
		secondaryActions,
		savedViews,
		filters,
		bulk,
		search: searchSlot,
		children,
		footer,
		class: className = ''
	}: Props = $props();

	let filtersOpen = $state(false);
</script>

{#snippet titleSlot()}
	<div class="stack stack-tight">
		<h1 class="h1">{title}</h1>
		{#if subtitle}
			<p class="caption text-fg-muted">{subtitle}</p>
		{/if}
	</div>
{/snippet}

{#snippet actionsSlot()}
	{#if secondaryActions}
		{#each secondaryActions as a (a.label)}
			<Button variant="tonal" size="md" disabled={a.disabled} onclick={a.onClick}>
				{#if a.icon}<Icon icon={a.icon} size="sm" />{/if}
				{a.label}
			</Button>
		{/each}
	{/if}
	{#if primaryAction}
		<Button disabled={primaryAction.disabled} onclick={primaryAction.onClick}>
			{#if primaryAction.icon}<Icon icon={primaryAction.icon} size="sm" />{/if}
			{primaryAction.label}
		</Button>
	{/if}
{/snippet}

{#snippet tabsSlot()}
	{#if savedViews}
		<nav aria-label="Saved views">
			<ul class="cluster list-none gap-0">
				{#each savedViews.views as v (v.id)}
					{@const active = savedViews.isActive(v.id)}
					{@const count = v.count?.() ?? null}
					<li>
						<button
							type="button"
							aria-current={active ? 'page' : undefined}
							onclick={() => savedViews.activate(v.id)}
							class={[
								'label -mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2 transition-colors',
								'focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
								'focus-visible:ring-focus-ring',
								active
									? 'border-primary text-primary'
									: 'text-fg-muted hover:text-fg border-transparent'
							]}
						>
							{v.label}
							{#if count !== null}
								<span class="caption text-fg-subtle">{count}</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
{/snippet}

<div class={cn('stack stack-relaxed', className)}>
	<Toolbar
		title={titleSlot}
		search={searchSlot}
		actions={actionsSlot}
		tabs={savedViews ? tabsSlot : undefined}
	/>

	{#if filters}
		<FilterBar fields={filters.config} urlFilters={filters.instance} bind:open={filtersOpen} />
		<FilterChips urlFilters={filters.instance} />
	{/if}

	{@render children()}

	{#if bulk}
		<BulkActionBar selection={bulk.selection} actions={bulk.actions} />
	{/if}

	{#if footer}
		{@render footer()}
	{/if}
</div>
