<!-- src/lib/components/data/ResourceListPage.svelte -->
<script lang="ts" module>
	import type { Component, Snippet } from 'svelte';
	import BulkActionBar, { type BulkAction } from './BulkActionBar.svelte';
	import FilterBar, { type FilterBarField } from './FilterBar.svelte';

	export interface ResourceListAction {
		label: string;
		icon?: Component;
		onClick: () => void;
		disabled?: boolean;
	}
</script>

<script
	lang="ts"
	generics="TFilters extends import('#lib/hooks/index.ts').UrlFiltersBase, TItem extends import('#lib/hooks/index.ts').SelectableItem"
>
	import { _ } from 'svelte-i18n';
	import type { UrlFilters, BulkSelection, SavedViews } from '#lib/hooks/index.ts';
	import { Button } from '$ui';
	import { Icon } from '$icons';
	import { cn } from '#lib/utils/cn.ts';
	import Toolbar from './Toolbar.svelte';
	import PageHeader from '$layouts/PageHeader.svelte';
	import FilterChips from './FilterChips.svelte';
	import SearchInput from './SearchInput.svelte';

	/**
	 * ResourceListPage — page-level template composing every primitive
	 * in this folder: title row (PageHeader), toolbar with the search box, saved-view tabs, status
	 * chips, filter bar, filter chips, list body, sticky bulk-action bar.
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
		/** Header content before the buttons: a link to a sibling page (a navigation is a link, not a button). */
		headerActions?: Snippet;
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
		/** The search box of the list (a `SearchInput`): what the page searches for, and what to do when it changes. */
		search?: {
			value: string;
			onSearch: (query: string) => void;
			label: string;
			placeholder?: string;
			maxlength?: number;
		};
		/** Status chips (a `StatusChips`) or any row of quick filters, under the toolbar. */
		chips?: Snippet;
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
		headerActions,
		secondaryActions,
		savedViews,
		filters,
		bulk,
		search,
		chips,
		children,
		footer,
		class: className = ''
	}: Props = $props();

	let filtersOpen = $state(false);
</script>

{#snippet actionsSlot()}
	{@render headerActions?.()}
	{#if secondaryActions}
		{#each secondaryActions as a (a.label)}
			<Button variant="tonal" disabled={a.disabled} onclick={a.onClick}>
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

{#snippet searchSlot()}
	{#if search}
		<SearchInput
			value={search.value}
			onSearch={search.onSearch}
			label={search.label}
			placeholder={search.placeholder}
			maxlength={search.maxlength}
		/>
	{/if}
{/snippet}

{#snippet tabsSlot()}
	{#if savedViews}
		<nav aria-label={$_('common.savedViews')}>
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
								'focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
								'focus-visible:ring-ring',
								active
									? 'border-primary-indicator text-primary-text'
									: 'text-muted-foreground hover:text-foreground border-transparent'
							]}
						>
							{v.label}
							{#if count !== null}
								<span class="caption text-subtle-foreground">{count}</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
{/snippet}

<div class={cn('stack stack-relaxed', className)}>
	<PageHeader {title} description={subtitle}>
		{#snippet actions()}
			<div class="cluster cluster-tight">{@render actionsSlot()}</div>
		{/snippet}
	</PageHeader>

	{#if search || savedViews}
		<Toolbar search={search ? searchSlot : undefined} tabs={savedViews ? tabsSlot : undefined} />
	{/if}

	{#if chips}
		{@render chips()}
	{/if}

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
