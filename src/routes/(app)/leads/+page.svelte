<script lang="ts">
	/**
	 * Leads list page — composes the canonical `<ResourceListPage>` shell
	 * with a Kanban (default) / Table (alt) view switcher driven by the
	 * `?view=` URL param.
	 *
	 * Per CLAUDE.md the page is the composition layer: hooks own state,
	 * primitives render UI, this file wires them together. Bulk upload,
	 * filters, saved views, bulk selection — all delegated.
	 */
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ResourceListPage } from '$lib/components/data';
	import type { BulkAction } from '$lib/components/data';
	import { Tabs } from '$ui';
	import BulkUploadDrawerShared from '$lib/components/data/BulkUploadDrawer.svelte';
	import { TextField } from '$form';
	import { Upload } from '$icons';
	import {
		UseUrlFilters,
		UseBulkSelection,
		UseKeyboardListNav,
		UseSavedViews,
		type SavedView
	} from '$lib/hooks';
	import { LEAD_FILTER_FIELDS, type LeadUrlFilters } from '$features/leads/filter-config';
	import {
		leadsInfiniteQuery,
		bulkLeadActionMutation,
		bulkUploadCommitMutation,
		bulkUploadPreviewMutation
	} from '$features/leads/queries';
	import { myCapabilitiesQuery } from '$features/auth/queries';
	import LeadsKanban from '$features/leads/components/LeadsKanban.svelte';
	import LeadsTable from '$features/leads/components/LeadsTable.svelte';
	import EditLeadDrawer from '$features/leads/components/EditLeadDrawer.svelte';
	import type {
		CrmLeadDto,
		LeadStage,
		LeadTemperature,
		ListLeadsParams
	} from '$features/leads/schemas';

	// ── URL filters ──────────────────────────────────────────────────
	const filters = new UseUrlFilters<LeadUrlFilters>({
		q: { type: 'string', label: 'Search' },
		stage: { type: 'string[]', label: 'Stage' },
		temperature: { type: 'string[]', label: 'Temperature' },
		owner_membership_id: { type: 'string', label: 'Owner' },
		state: { type: 'string', label: 'State' },
		pin_code: { type: 'string', label: 'PIN code' },
		business_type: { type: 'string', label: 'Business type' },
		medicine_system: { type: 'string', label: 'Medicine system' },
		order_value_band: { type: 'string', label: 'Order value' },
		buy_timeline: { type: 'string', label: 'Buy timeline' },
		has_drug_licence: { type: 'string', label: 'Has drug licence' },
		has_gst: { type: 'string', label: 'Has GST' },
		view: { type: 'string', label: 'View' },
		sort: { type: 'string', label: 'Sort' }
	});

	// ── Saved views ──────────────────────────────────────────────────
	const caps = myCapabilitiesQuery();
	const callerMembershipId = $derived(caps.data?.membership_id ?? '');

	const savedViewDefs = $derived<SavedView<LeadUrlFilters>[]>([
		{ id: 'all', label: 'All', filters: {} },
		{
			id: 'hot',
			label: 'Hot leads',
			filters: { temperature: ['hot' as LeadTemperature] }
		},
		{
			id: 'mine',
			label: 'My leads',
			filters: { owner_membership_id: callerMembershipId || undefined }
		},
		{
			id: 'overdue',
			label: 'Overdue followup',
			filters: { stage: ['contacted', 'interested', 'negotiation'] as LeadStage[] }
		}
	]);

	const savedViews = $derived(new UseSavedViews<LeadUrlFilters>(savedViewDefs, filters));

	// ── View tab (kanban / table) ────────────────────────────────────
	type ViewMode = 'kanban' | 'table';
	const viewMode = $derived<ViewMode>(
		page.url.searchParams.get('view') === 'table' ? 'table' : 'kanban'
	);
	function setViewMode(next: ViewMode) {
		const next_url = new URL(page.url);
		if (next === 'kanban') next_url.searchParams.delete('view');
		else next_url.searchParams.set('view', 'table');
		goto(`${next_url.pathname}${next_url.search}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	// ── Query params projection ──────────────────────────────────────
	function buildListParams(): ListLeadsParams {
		const f = filters.filters;
		return {
			q: f.q || undefined,
			stage: (f.stage as LeadStage[] | undefined) ?? undefined,
			temperature: (f.temperature as LeadTemperature[] | undefined) ?? undefined,
			owner_membership_id: f.owner_membership_id || undefined,
			state: f.state || undefined,
			pin_code: f.pin_code || undefined,
			business_type: (f.business_type as ListLeadsParams['business_type']) ?? undefined,
			medicine_system: (f.medicine_system as ListLeadsParams['medicine_system']) ?? undefined,
			order_value_band: (f.order_value_band as ListLeadsParams['order_value_band']) ?? undefined,
			buy_timeline: (f.buy_timeline as ListLeadsParams['buy_timeline']) ?? undefined,
			has_drug_licence: f.has_drug_licence === 'true' ? true : undefined,
			has_gst: f.has_gst === 'true' ? true : undefined,
			sort: f.sort,
			limit: 50
		};
	}

	// ── List + selection + keyboard nav ──────────────────────────────
	const list = leadsInfiniteQuery(() => buildListParams());
	const selection = new UseBulkSelection<CrmLeadDto>();
	let editingLead: CrmLeadDto | null = $state(null);
	let editOpen = $state(false);
	let bulkUploadOpen = $state(false);

	const nav = new UseKeyboardListNav<CrmLeadDto>({
		isAnyOverlayOpen: () => editOpen || bulkUploadOpen,
		onSelect: (lead) => goto(`/leads/${lead.id}`),
		onEdit: (lead) => {
			editingLead = lead;
			editOpen = true;
		},
		onToggleSelect: (lead) => selection.toggle(lead.id)
	});

	$effect(() => {
		nav.setItems(list.items);
	});

	// ── Bulk actions ─────────────────────────────────────────────────
	const bulkMut = bulkLeadActionMutation();

	const bulkActions: BulkAction[] = [
		{
			id: 'reassign',
			label: 'Reassign',
			onClick: () => {
				// Bulk reassign would open a chooser; mark as no-op for v1.
				// Surface the future path via a toast: not wired this slice.
				bulkMut.mutate({
					ids: [...selection.selected],
					action: 'reassign'
				});
				selection.clear();
			}
		},
		{
			id: 'change-stage',
			label: 'Change stage',
			onClick: () => {
				bulkMut.mutate({
					ids: [...selection.selected],
					action: 'change_stage',
					stage: 'contacted'
				});
				selection.clear();
			}
		},
		{
			id: 'change-temperature',
			label: 'Change temperature',
			onClick: () => {
				bulkMut.mutate({
					ids: [...selection.selected],
					action: 'change_temperature',
					temperature: 'warm'
				});
				selection.clear();
			}
		}
	];

	// ── Bulk upload ──────────────────────────────────────────────────
	const previewMut = bulkUploadPreviewMutation();
	const commitMut = bulkUploadCommitMutation();

	function setQ(v: string) {
		filters.setFilter('q', v || undefined);
	}
</script>

<svelte:head><title>Leads · LeadKart</title></svelte:head>

<ResourceListPage
	title="Leads"
	subtitle={list.items.length > 0 ? `${list.items.length} loaded` : undefined}
	primaryAction={{
		label: 'Bulk upload',
		icon: Upload as never,
		onClick: () => (bulkUploadOpen = true)
	}}
	{savedViews}
	filters={{ config: LEAD_FILTER_FIELDS, instance: filters }}
	bulk={{ selection, actions: bulkActions }}
>
	{#snippet search()}
		<TextField
			label="Search leads"
			srLabel
			placeholder="Search by name, mobile, GSTIN…"
			value={filters.filters.q ?? ''}
			oninput={(e) => setQ((e.currentTarget as HTMLInputElement).value)}
		/>
	{/snippet}

	<div class="stack stack-relaxed">
		<Tabs.Root value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
			<Tabs.List variant="pills">
				<Tabs.Trigger value="kanban">Kanban</Tabs.Trigger>
				<Tabs.Trigger value="table">Table</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="kanban">
				<LeadsKanban leads={list.items} state={list.state} error={list.error} />
			</Tabs.Content>
			<Tabs.Content value="table">
				<LeadsTable {list} {selection} {nav} />
			</Tabs.Content>
		</Tabs.Root>
	</div>
</ResourceListPage>

<EditLeadDrawer lead={editingLead} bind:open={editOpen} onOpenChange={(o) => (editOpen = o)} />

<BulkUploadDrawerShared
	bind:open={bulkUploadOpen}
	onOpenChange={(o) => (bulkUploadOpen = o)}
	title="Bulk upload leads"
	description="Upload a CSV of leads. Preview validates each row before commit."
	accept=".csv,.xlsx"
	previewFn={(file) => previewMut.mutateAsync(file)}
	commitFn={(file, opts) =>
		commitMut.mutateAsync({
			file,
			upsertBy: (opts?.upsert_by as 'mobile_number' | 'none') ?? 'none'
		})}
	upsertOptions={[
		{ value: 'none', label: 'Insert only' },
		{ value: 'mobile_number', label: 'Upsert by mobile' }
	]}
/>
