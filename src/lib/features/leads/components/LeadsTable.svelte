<script lang="ts">
	/**
	 * LeadsTable — table view of leads with cursor-based infinite scroll,
	 * bulk select, inline stage + temperature pickers, and Linear-style
	 * keyboard nav (j/k/Enter/e/x — wired by the parent page).
	 *
	 * The table is rendered inline (rather than DataTable.Root) because we
	 * need a per-row checkbox column that the canonical DataTable doesn't
	 * yet expose. When `<DataTable>` grows a `selection` prop we'll fold
	 * back; for now the markup is small enough to maintain.
	 */
	import { goto } from '$app/navigation';
	import { Skeleton, EmptyState, StatusPill } from '$ui';
	import { Icon, Inbox } from '$icons';
	import { UseBulkSelection, type UseInfiniteList, type UseKeyboardListNav } from '$lib/hooks';
	import type { CrmLeadDto, LeadStage, LeadTemperature } from '../schemas';
	import {
		BUSINESS_TYPE_LABEL,
		STAGE_OPTIONS,
		TEMPERATURE_OPTIONS,
		isStale,
		locationLabel,
		relativeTime
	} from '../view-models';
	import { changeStageMutation, changeTemperatureMutation } from '../queries';

	type Props = {
		list: UseInfiniteList<CrmLeadDto>;
		selection: UseBulkSelection<CrmLeadDto>;
		nav: UseKeyboardListNav<CrmLeadDto>;
	};

	let { list, selection, nav }: Props = $props();

	const rows = $derived(list.items);

	const stageMut = changeStageMutation();
	const tempMut = changeTemperatureMutation();

	function changeStageInline(lead: CrmLeadDto, stage: string) {
		if (lead.stage === stage) return;
		stageMut.mutate({ id: lead.id, stage: stage as LeadStage, previous: lead.stage });
	}

	function changeTemperatureInline(lead: CrmLeadDto, temperature: string) {
		if (lead.temperature === temperature) return;
		tempMut.mutate({
			id: lead.id,
			temperature: temperature as LeadTemperature,
			previous: lead.temperature
		});
	}

	function openDetail(lead: CrmLeadDto) {
		goto(`/leads/${lead.id}`);
	}

	function toggleAll() {
		if (selection.areAllVisibleSelected(rows)) selection.deselectAllVisible(rows);
		else selection.selectAllVisible(rows);
	}

	const allSelected = $derived(rows.length > 0 && selection.areAllVisibleSelected(rows));
	const someSelected = $derived(selection.count > 0 && !allSelected);
</script>

{#if list.state === 'pending'}
	<div class="stack stack-tight" aria-busy="true" data-testid="leads-table-skeleton">
		{#each [0, 1, 2, 3, 4] as i (i)}
			<Skeleton class="h-12 w-full rounded-md" />
		{/each}
	</div>
{:else if list.state === 'error'}
	<div class="bg-danger-50 text-danger-900 border-danger-500 rounded-md border-s-4 p-4">
		<p class="label">Couldn't load leads. {list.error ?? ''}</p>
	</div>
{:else if list.state === 'empty'}
	<EmptyState
		icon={Inbox}
		title="No leads"
		description="Purchased platform leads land here. Bulk upload a CSV to import an existing pipeline."
	/>
{:else}
	<div class="overflow-x-auto" data-testid="leads-table">
		<table class="w-full text-start">
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
						Contact
					</th>
					<th
						class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase md:table-cell"
					>
						Location
					</th>
					<th
						class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase md:table-cell"
					>
						Stage
					</th>
					<th
						class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
					>
						Temp
					</th>
					<th
						class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
					>
						Business
					</th>
					<th
						class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase xl:table-cell"
					>
						Last contacted
					</th>
				</tr>
			</thead>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<tbody
				data-roving-root
				onkeydown={(e) => nav.handleKey(e)}
				onfocusin={() => nav.onFocusIn()}
				onfocusout={(e) => nav.onFocusOut(e)}
			>
				{#each rows as lead, i (lead.id)}
					{@const focused = nav.hasFocus && nav.focusedIdx === i}
					{@const stale = isStale(lead)}
					<tr
						data-testid="lead-row"
						data-lead-id={lead.id}
						class={[
							'border-border hover:bg-bg-muted cursor-pointer border-b transition-colors',
							focused && 'bg-bg-muted',
							focused && 'border-l-primary border-s-4'
						]}
						onclick={() => openDetail(lead)}
						tabindex={nav.tabindexFor(i)}
						{@attach (el) => {
							nav.registerRef(lead.id, el as HTMLElement);
							return () => nav.registerRef(lead.id, null);
						}}
						onkeydown={(e) => {
							if (e.key === ' ') {
								e.preventDefault();
								openDetail(lead);
							}
						}}
					>
						<td class="w-10 px-3 py-3" onclick={(e) => e.stopPropagation()} role="cell">
							<input
								type="checkbox"
								checked={selection.isSelected(lead.id)}
								onchange={() => selection.toggle(lead.id)}
								aria-label={`Select ${lead.contact_name}`}
							/>
						</td>
						<td class="px-3 py-3">
							<div class="stack stack-tight">
								<div class="cluster cluster-tight">
									<span class="label text-fg">{lead.contact_name}</span>
									{#if stale}
										<span
											class="bg-warning-500 inline-block h-2 w-2 rounded-full"
											aria-label="Stale lead"
											title="No contact in 7+ days"
										></span>
									{/if}
								</div>
								<span class="caption text-fg-muted">{lead.mobile_number}</span>
							</div>
						</td>
						<td class="hidden px-3 py-3 md:table-cell">
							<span class="caption text-fg-muted">{locationLabel(lead)}</span>
						</td>
						<td
							class="hidden px-3 py-3 md:table-cell"
							onclick={(e) => e.stopPropagation()}
							role="cell"
						>
							<StatusPill
								value={lead.stage}
								options={[...STAGE_OPTIONS]}
								onChange={(v) => changeStageInline(lead, v)}
							/>
						</td>
						<td
							class="hidden px-3 py-3 lg:table-cell"
							onclick={(e) => e.stopPropagation()}
							role="cell"
						>
							<StatusPill
								value={lead.temperature}
								options={[...TEMPERATURE_OPTIONS]}
								onChange={(v) => changeTemperatureInline(lead, v)}
							/>
						</td>
						<td class="hidden px-3 py-3 lg:table-cell">
							<span class="caption text-fg-muted">{BUSINESS_TYPE_LABEL[lead.business_type]}</span>
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
	<div bind:this={list.sentinelRef} class="h-px w-full" aria-hidden="true"></div>

	{#if list.isFetchingNextPage}
		<div class="cluster justify-center py-4">
			<span class="caption text-fg-muted">Loading more…</span>
		</div>
	{:else if !list.hasNextPage && rows.length > 0}
		<div class="cluster justify-center py-4">
			<span class="caption text-fg-subtle">— end of list —</span>
		</div>
	{/if}
{/if}

<span class="hidden"><Icon icon={Inbox} size="xs" /></span>
