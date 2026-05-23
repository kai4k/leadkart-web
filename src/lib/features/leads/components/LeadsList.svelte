<script lang="ts">
	import { page as pageStore } from '$app/stores';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams, SvelteSet } from 'svelte/reactivity';
	import { Badge, Button, EmptyState, Skeleton, Dropdown } from '$ui';
	import { Icon, Inbox, Plus, ChevronDown, ChevronUp, ChevronsUpDown } from '$icons';
	import {
		leadsInfiniteQuery,
		bulkLeadActionMutation,
		changeStageMutation
	} from '$features/leads/queries';
	import {
		formatValue,
		sourceLabel,
		stageBadge,
		isStale,
		savedViews,
		STAGE_OPTIONS,
		relativeTime
	} from '$features/leads/view-models';
	import { myCapabilitiesQuery } from '$features/auth/queries';
	import type {
		LeadDto,
		LeadStage,
		LeadSource,
		ListLeadsParams,
		BulkLeadActionRequest
	} from '$features/leads/schemas';
	import LeadFiltersBar from './LeadFiltersBar.svelte';
	import CreateLeadDrawer from './CreateLeadDrawer.svelte';
	import EditLeadDrawer from './EditLeadDrawer.svelte';
	import BulkUploadDrawer from './BulkUploadDrawer.svelte';
	import BulkActionsBar from './BulkActionsBar.svelte';

	/**
	 * LeadsList — server-driven CRM table with cursor pagination,
	 * URL-state filters, bulk select, inline stage editing, keyboard
	 * shortcuts (j/k/Enter/e/x), and CSV bulk upload.
	 */

	// ── URL-derived filter state ─────────────────────────────────────
	const params = $derived($pageStore.url.searchParams);

	const q = $derived(params.get('q') ?? '');
	const stages = $derived(
		(params.getAll('stage') as LeadStage[]).filter(
			(s): s is LeadStage =>
				s === 'new' ||
				s === 'contacted' ||
				s === 'qualified' ||
				s === 'proposal' ||
				s === 'won' ||
				s === 'lost'
		)
	);
	const sources = $derived(
		(params.getAll('source') as LeadSource[]).filter(
			(s): s is LeadSource =>
				s === 'website' ||
				s === 'referral' ||
				s === 'ads' ||
				s === 'marketplace' ||
				s === 'manual' ||
				s === 'import' ||
				s === 'other'
		)
	);
	const ownerFilter = $derived(params.get('owner_membership_id') ?? undefined);
	const view = $derived(params.get('view') ?? 'all');
	const sort = $derived(params.get('sort') ?? 'created_at:desc');
	const staleOnly = $derived(view === 'stale');

	const queryParams = $derived<ListLeadsParams>({
		q: q || undefined,
		stage: stages.length > 0 ? stages : undefined,
		source: sources.length > 0 ? sources : undefined,
		owner_membership_id: ownerFilter,
		sort,
		limit: 50
	});

	const listQuery = leadsInfiniteQuery(() => queryParams);

	const allRows = $derived(listQuery.data?.pages.flatMap((p) => p.items) ?? []);
	const rows = $derived(staleOnly ? allRows.filter((l) => isStale(l)) : allRows);

	// ── Selection state ───────────────────────────────────────────────
	// SvelteSet for fine-grained reactivity on size + membership checks.
	const selected = new SvelteSet<string>();

	function toggleRow(id: string) {
		if (selected.has(id)) selected.delete(id);
		else selected.add(id);
	}
	function toggleAll() {
		if (selected.size >= rows.length) {
			selected.clear();
		} else {
			selected.clear();
			for (const r of rows) selected.add(r.id);
		}
	}
	function clearSelection() {
		selected.clear();
	}

	const allSelected = $derived(rows.length > 0 && selected.size === rows.length);
	const someSelected = $derived(selected.size > 0 && selected.size < rows.length);

	// ── URL writers ───────────────────────────────────────────────────
	function setParams(mut: (p: SvelteURLSearchParams) => void) {
		const next = new SvelteURLSearchParams($pageStore.url.searchParams.toString());
		mut(next);
		const qs = next.toString();
		goto(qs ? `?${qs}` : `${$pageStore.url.pathname}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}
	function setQ(next: string) {
		setParams((p) => {
			if (next) p.set('q', next);
			else p.delete('q');
		});
	}
	function setStages(next: LeadStage[]) {
		setParams((p) => {
			p.delete('stage');
			for (const s of next) p.append('stage', s);
		});
	}
	function setSources(next: LeadSource[]) {
		setParams((p) => {
			p.delete('source');
			for (const s of next) p.append('source', s);
		});
	}
	function clearAll() {
		setParams((p) => {
			p.delete('q');
			p.delete('stage');
			p.delete('source');
			p.delete('owner_membership_id');
			p.delete('view');
		});
	}
	function setSort(column: string) {
		const [col, ord] = sort.split(':');
		const nextOrd =
			col === column && ord === 'asc' ? 'desc' : col === column && ord === 'desc' ? '' : 'asc';
		setParams((p) => {
			if (nextOrd) p.set('sort', `${column}:${nextOrd}`);
			else p.delete('sort');
		});
	}

	// ── Saved views ──────────────────────────────────────────────────
	const caps = myCapabilitiesQuery();
	const callerMembershipId = $derived(caps.data?.membership_id ?? '');
	const views = $derived(savedViews(callerMembershipId));
	const currentView = $derived(views.find((v) => v.id === view) ?? views[0]);

	function applyView(viewId: string) {
		const v = views.find((x) => x.id === viewId);
		if (!v) return;
		setParams((p) => {
			p.delete('stage');
			p.delete('owner_membership_id');
			p.delete('view');
			if (viewId !== 'all') p.set('view', viewId);
			for (const s of v.stage ?? []) p.append('stage', s);
			if (v.owner_membership_id) p.set('owner_membership_id', v.owner_membership_id);
		});
	}

	// ── Drawers / mutations ───────────────────────────────────────────
	let createOpen = $state(false);
	let editOpen = $state(false);
	let bulkOpen = $state(false);
	let editingLead = $state<LeadDto | null>(null);

	const bulkMutation = bulkLeadActionMutation();
	const stageMutation = changeStageMutation();

	function handleBulk(req: BulkLeadActionRequest) {
		bulkMutation.mutate(req, {
			onSuccess: () => {
				clearSelection();
			}
		});
	}

	function openEdit(lead: LeadDto) {
		editingLead = lead;
		editOpen = true;
	}

	function openDetail(lead: LeadDto) {
		goto(`/leads/${lead.id}`);
	}

	function changeStageInline(lead: LeadDto, stage: LeadStage) {
		if (lead.stage === stage) return;
		stageMutation.mutate({ id: lead.id, stage, previous: lead.stage });
	}

	// ── Keyboard navigation (j/k/Enter/e/x) ──────────────────────────
	let focusedRowIndex = $state(-1);

	function isTypingTarget(t: EventTarget | null): boolean {
		const el = t as HTMLElement | null;
		if (!el) return false;
		const tag = el.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
	}

	function onKeydown(e: KeyboardEvent) {
		if (isTypingTarget(document.activeElement)) return;
		if (createOpen || editOpen || bulkOpen) return;
		if (rows.length === 0) return;
		const idx = focusedRowIndex;
		if (e.key === 'j') {
			focusedRowIndex = Math.min(idx + 1, rows.length - 1);
			e.preventDefault();
		} else if (e.key === 'k') {
			focusedRowIndex = Math.max(idx - 1, 0);
			e.preventDefault();
		} else if (e.key === 'Enter') {
			const lead = rows[idx];
			if (lead) openDetail(lead);
		} else if (e.key === 'e') {
			const lead = rows[idx];
			if (lead) openEdit(lead);
		} else if (e.key === 'x') {
			const lead = rows[idx];
			if (lead) toggleRow(lead.id);
		}
	}

	// ── Infinite scroll sentinel ──────────────────────────────────────
	let sentinel: HTMLDivElement | null = $state(null);

	$effect(() => {
		if (!sentinel) return;
		const target = sentinel;
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting && listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
					listQuery.fetchNextPage();
				}
			}
		});
		observer.observe(target);
		return () => observer.disconnect();
	});

	const tableState = $derived(
		listQuery.isPending
			? 'loading'
			: listQuery.isError
				? 'error'
				: rows.length === 0
					? 'empty'
					: 'ready'
	);

	// Sort indicator helpers
	function sortIcon(column: string) {
		const [col, ord] = sort.split(':');
		if (col !== column) return ChevronsUpDown;
		return ord === 'asc' ? ChevronUp : ChevronDown;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Leads</h1>
			<p class="caption text-fg-muted">
				Pipeline-wide list of prospects. Filter, search, and bulk update from one place.
			</p>
		</div>
		<div class="cluster cluster-tight">
			<Button variant="tonal" onclick={() => (bulkOpen = true)}>
				<Icon icon={Inbox} size="sm" /> Bulk upload
			</Button>
			<Button onclick={() => (createOpen = true)}>
				<Icon icon={Plus} size="sm" /> New lead
			</Button>
		</div>
	</header>

	<!-- Saved views -->
	<div class="cluster cluster-spread">
		<div class="cluster cluster-tight" role="tablist" aria-label="Saved views">
			{#each views as v (v.id)}
				{@const active = currentView.id === v.id}
				<button
					type="button"
					role="tab"
					aria-selected={active}
					onclick={() => applyView(v.id)}
					class={[
						'label rounded-md px-3 py-1.5 text-sm transition-colors',
						'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none',
						active ? 'bg-primary-soft text-primary' : 'text-fg-muted hover:bg-bg-muted'
					]}
				>
					{v.label}
				</button>
			{/each}
		</div>
		<Dropdown.Root>
			<Dropdown.Trigger>
				<Button variant="ghost" size="sm">
					Sort: {sort.replace(':', ' ')}
					<Icon icon={ChevronDown} size="xs" />
				</Button>
			</Dropdown.Trigger>
			<Dropdown.Menu>
				<Dropdown.Item onSelect={() => setSort('created_at')}>Newest first</Dropdown.Item>
				<Dropdown.Item onSelect={() => setSort('value')}>Highest value</Dropdown.Item>
				<Dropdown.Item onSelect={() => setSort('next_followup_at')}>Soonest followup</Dropdown.Item>
			</Dropdown.Menu>
		</Dropdown.Root>
	</div>

	<LeadFiltersBar
		{q}
		{stages}
		{sources}
		onQChange={setQ}
		onStagesChange={setStages}
		onSourcesChange={setSources}
		onClearAll={clearAll}
	/>

	{#if tableState === 'loading'}
		<div class="stack stack-tight" aria-busy="true" data-testid="leads-skeleton">
			{#each [0, 1, 2, 3, 4] as i (i)}
				<Skeleton class="h-12 w-full rounded-md" />
			{/each}
		</div>
	{:else if tableState === 'error'}
		<div class="bg-danger-50 text-danger-900 border-danger-500 rounded-md border-l-4 p-4">
			<p class="label">Couldn't load leads. {listQuery.error?.message ?? ''}</p>
		</div>
	{:else if tableState === 'empty'}
		<EmptyState
			icon={Inbox}
			title="No leads yet"
			description="Create your first lead manually, or bulk upload from a CSV."
		>
			{#snippet action()}
				<div class="cluster cluster-tight">
					<Button onclick={() => (createOpen = true)}>
						<Icon icon={Plus} size="sm" /> New lead
					</Button>
					<Button variant="tonal" onclick={() => (bulkOpen = true)}>
						<Icon icon={Inbox} size="sm" /> Bulk upload
					</Button>
				</div>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="overflow-x-auto" data-testid="leads-table">
			<table class="w-full text-left">
				<thead>
					<tr class="border-border border-b">
						<th class="w-10 px-3 py-3">
							<input
								type="checkbox"
								checked={allSelected}
								indeterminate={someSelected}
								onchange={toggleAll}
								aria-label={allSelected ? 'Deselect all' : 'Select all'}
							/>
						</th>
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							<button
								type="button"
								class="cluster cluster-tight hover:text-fg inline-flex"
								onclick={() => setSort('full_name')}
							>
								Lead <Icon icon={sortIcon('full_name')} size="xs" class="opacity-60" />
							</button>
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase md:table-cell"
						>
							Stage
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
						>
							Source
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
						>
							<button
								type="button"
								class="cluster cluster-tight hover:text-fg inline-flex"
								onclick={() => setSort('value')}
							>
								Value <Icon icon={sortIcon('value')} size="xs" class="opacity-60" />
							</button>
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase xl:table-cell"
						>
							Last contacted
						</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as lead, i (lead.id)}
						{@const meta = stageBadge(lead.stage)}
						{@const focused = focusedRowIndex === i}
						{@const stale = isStale(lead)}
						<tr
							data-testid="lead-row"
							data-lead-id={lead.id}
							class={[
								'border-border hover:bg-bg-muted cursor-pointer border-b transition-colors',
								focused && 'bg-bg-muted',
								focused && 'border-l-primary border-l-4'
							]}
							onclick={() => openDetail(lead)}
							tabindex={0}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openDetail(lead);
								}
							}}
						>
							<td
								class="w-10 px-3 py-3"
								onclick={(e) => {
									e.stopPropagation();
								}}
								role="cell"
							>
								<input
									type="checkbox"
									checked={selected.has(lead.id)}
									onchange={() => toggleRow(lead.id)}
									aria-label={`Select ${lead.full_name}`}
								/>
							</td>
							<td class="px-3 py-3">
								<div class="stack stack-tight">
									<div class="cluster cluster-tight">
										<span class="label text-fg">{lead.full_name}</span>
										{#if stale}
											<span
												class="bg-warning-500 inline-block h-2 w-2 rounded-full"
												aria-label="Stale lead"
												title="No contact in 7+ days"
											></span>
										{/if}
									</div>
									{#if lead.company || lead.email}
										<span class="caption text-fg-muted">
											{lead.company ?? lead.email ?? ''}
										</span>
									{/if}
								</div>
							</td>
							<td
								class="hidden px-3 py-3 md:table-cell"
								onclick={(e) => e.stopPropagation()}
								role="cell"
							>
								<Dropdown.Root>
									<Dropdown.Trigger>
										<button
											type="button"
											class="focus-visible:ring-focus-ring inline-flex items-center gap-1 rounded-full focus-visible:ring-2 focus-visible:outline-none"
											aria-label={`Change stage for ${lead.full_name}. Current: ${meta.label}`}
											data-testid="stage-cell"
										>
											<Badge variant={meta.variant} style="soft" size="sm">{meta.label}</Badge>
											<Icon icon={ChevronDown} size="xs" class="opacity-60" />
										</button>
									</Dropdown.Trigger>
									<Dropdown.Menu>
										{#each STAGE_OPTIONS as s (s.value)}
											<Dropdown.Item onSelect={() => changeStageInline(lead, s.value)}>
												{s.label}
											</Dropdown.Item>
										{/each}
									</Dropdown.Menu>
								</Dropdown.Root>
							</td>
							<td class="hidden px-3 py-3 lg:table-cell">
								<span class="caption text-fg-muted">{sourceLabel(lead.source)}</span>
							</td>
							<td class="hidden px-3 py-3 lg:table-cell">
								<span class="label text-fg">{formatValue(lead.value, lead.currency)}</span>
							</td>
							<td class="hidden px-3 py-3 xl:table-cell">
								<span class="caption text-fg-muted">{relativeTime(lead.last_contacted_at)}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Infinite scroll sentinel -->
		<div bind:this={sentinel} class="h-px w-full" aria-hidden="true"></div>

		{#if listQuery.isFetchingNextPage}
			<div class="cluster justify-center py-4">
				<span class="caption text-fg-muted">Loading more…</span>
			</div>
		{:else if !listQuery.hasNextPage && rows.length > 0}
			<div class="cluster justify-center py-4">
				<span class="caption text-fg-subtle">— end of list —</span>
			</div>
		{/if}
	{/if}
</div>

<BulkActionsBar {selected} onClear={clearSelection} onAction={handleBulk} />

<CreateLeadDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<EditLeadDrawer bind:open={editOpen} onOpenChange={(o) => (editOpen = o)} lead={editingLead} />
<BulkUploadDrawer bind:open={bulkOpen} onOpenChange={(o) => (bulkOpen = o)} />
