<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DataTable, { type DataTableColumn } from './DataTable.svelte';
	import { Badge } from '$ui/badge';
	import { Button } from '$ui/button';
	import StatusPill from '$ui/StatusPill.svelte';
	import { EmptyState } from '$ui';
	import { createBulkSelection } from '$lib/hooks';
	import { Edit, Trash2, Database } from '$icons';

	const { Story } = defineMeta({
		title: 'Data/DataTable',
		component: DataTable,
		tags: ['autodocs']
	});

	type Tenant = {
		id: string;
		name: string;
		gstin: string;
		state: string;
		members: number;
		status: 'active' | 'suspended' | 'pending';
		tier: 'starter' | 'growth' | 'scale';
		created_at: string;
	};

	const TENANTS: Tenant[] = [
		{
			id: 't_001',
			name: 'Acme Pharma Pvt Ltd',
			gstin: '27AABCA1234A1ZQ',
			state: 'Maharashtra',
			members: 12,
			status: 'active',
			tier: 'scale',
			created_at: '2026-03-14'
		},
		{
			id: 't_002',
			name: 'HealWell Pharma',
			gstin: '29AABCH9876B1ZK',
			state: 'Karnataka',
			members: 4,
			status: 'active',
			tier: 'growth',
			created_at: '2026-03-20'
		},
		{
			id: 't_003',
			name: 'MediCare Distributors',
			gstin: '33AABCM5432C1ZP',
			state: 'Tamil Nadu',
			members: 8,
			status: 'suspended',
			tier: 'growth',
			created_at: '2026-02-08'
		},
		{
			id: 't_004',
			name: 'GreenLife Sciences',
			gstin: '24AABCG1234D1ZE',
			state: 'Gujarat',
			members: 2,
			status: 'pending',
			tier: 'starter',
			created_at: '2026-05-22'
		},
		{
			id: 't_005',
			name: 'Apex Healthcare',
			gstin: '07AABCA9999E1ZB',
			state: 'Delhi',
			members: 24,
			status: 'active',
			tier: 'scale',
			created_at: '2025-12-01'
		}
	];

	const COLUMNS: DataTableColumn<Tenant>[] = [
		{ id: 'name', header: 'Tenant', accessor: 'name', sortBy: 'name' },
		{ id: 'gstin', header: 'GSTIN', accessor: 'gstin', hideBelow: 'md' },
		{ id: 'state', header: 'State', accessor: 'state', hideBelow: 'lg' },
		{
			id: 'members',
			header: 'Members',
			accessor: 'members',
			sortBy: 'members',
			class: 'text-end tabular-nums'
		},
		{ id: 'status', header: 'Status' },
		{ id: 'tier', header: 'Tier', hideBelow: 'sm' },
		{
			id: 'created_at',
			header: 'Created',
			accessor: 'created_at',
			sortBy: 'created_at',
			hideBelow: 'xl'
		}
	];

	const selection = createBulkSelection<Tenant>();
	const SELECTABLE_COLUMNS: DataTableColumn<Tenant>[] = [{ id: 'select', header: '' }, ...COLUMNS];
</script>

<Story name="Ready (data)">
	<div style="width: 100%; max-width: 1080px;">
		<DataTable
			columns={COLUMNS}
			rows={TENANTS}
			rowKey={(t) => t.id}
			sort={{ column: 'name', order: 'asc' }}
			onSortChange={() => {}}
		>
			{#snippet emptyState()}<EmptyState title="" />{/snippet}
		</DataTable>
	</div>
</Story>

<Story name="With custom cells (Badge + StatusPill)">
	{@const cols = [
		{ id: 'name', header: 'Tenant', accessor: 'name' as const, sortBy: 'name' },
		{ id: 'gstin', header: 'GSTIN', accessor: 'gstin' as const, hideBelow: 'md' as const },
		{
			id: 'members',
			header: 'Members',
			accessor: 'members' as const,
			class: 'text-end tabular-nums'
		},
		{
			id: 'status',
			header: 'Status',
			cell: statusCell
		},
		{
			id: 'tier',
			header: 'Tier',
			cell: tierCell
		}
	] as DataTableColumn<Tenant>[]}
	<div style="width: 100%; max-width: 1080px;">
		<DataTable columns={cols} rows={TENANTS} rowKey={(t) => t.id} />
	</div>
</Story>

{#snippet statusCell(row: Tenant)}
	<StatusPill value={row.status} />
{/snippet}

{#snippet tierCell(row: Tenant)}
	<Badge
		variant={row.tier === 'scale' ? 'primary' : row.tier === 'growth' ? 'info' : 'neutral'}
		appearance="soft"
		size="sm"
	>
		{row.tier}
	</Badge>
{/snippet}

<Story name="Selectable rows + bulk select">
	<div style="width: 100%; max-width: 1080px;">
		<DataTable columns={SELECTABLE_COLUMNS} rows={TENANTS} rowKey={(t) => t.id} {selection} />
	</div>
</Story>

<Story name="With row actions">
	<div style="width: 100%; max-width: 1080px;">
		<DataTable columns={COLUMNS} rows={TENANTS} rowKey={(t) => t.id} onRowClick={() => {}}>
			{#snippet rowActions(_row)}
				<div class="cluster cluster-tight">
					<Button variant="ghost" size="icon" aria-label="Edit row">
						<Edit size={14} />
					</Button>
					<Button variant="ghost" size="icon" aria-label="Delete row">
						<Trash2 size={14} />
					</Button>
				</div>
			{/snippet}
		</DataTable>
	</div>
</Story>

<Story name="Loading state">
	<div style="width: 100%; max-width: 1080px;">
		<DataTable columns={COLUMNS} rows={[]} rowKey={(t: Tenant) => t.id} state="loading" />
	</div>
</Story>

<Story name="Empty state">
	<div style="width: 100%; max-width: 1080px;">
		<DataTable columns={COLUMNS} rows={[]} rowKey={(t: Tenant) => t.id} state="empty">
			{#snippet emptyState()}
				<EmptyState
					icon={Database}
					title="No tenants yet"
					description="Onboard your first tenant to populate this list."
				>
					{#snippet action()}
						<Button>Add tenant</Button>
					{/snippet}
				</EmptyState>
			{/snippet}
		</DataTable>
	</div>
</Story>

<Story name="Error state">
	<div style="width: 100%; max-width: 1080px;">
		<DataTable
			columns={COLUMNS}
			rows={[]}
			rowKey={(t: Tenant) => t.id}
			state="error"
			error="Failed to fetch tenants. Check your network connection and retry."
		/>
	</div>
</Story>
