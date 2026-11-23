<script lang="ts">
	/**
	 * DataTable bench: 1,000 seeded rows, eight columns, client sorting, multi selection, row links and
	 * keyboard navigation. It exists for the virtualisation e2e (`tests/e2e/data-table.spec.ts`) and for
	 * the material scroll perf spec, which toggles `transparency` here to compare glass with solid.
	 * Like the styleguide it lives in the `(dev)` route group and is linked from nowhere.
	 */
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import { Button } from '#lib/components/ui/index.ts';
	import { DataTable } from '#lib/components/data/data-table/index.ts';
	import { IdentityCell, type DataTableColumn } from '#lib/components/data/index.ts';
	import { createBulkSelection, createKeyboardListNav } from '#lib/hooks/index.ts';
	import { getPreferences, PREFERENCE_VALUES } from '$features/preferences';

	type Row = {
		id: string;
		name: string;
		email: string;
		role: string;
		region: string;
		status: string;
		score: number;
		joined: string;
		/** Every fifth row has a subtitle; every seventh a long note that wraps: rows of three heights. */
		subtitle?: string;
		note: string;
	};

	const COUNT = 1000;
	const ROLES = ['Admin', 'Manager', 'Sales', 'Support'];
	const REGIONS = ['North', 'South', 'East', 'West'];
	const STATUSES = ['Active', 'Invited', 'Suspended'];
	const FIRST = ['Asha', 'Bram', 'Chen', 'Dara', 'Eli', 'Faye', 'Gus', 'Hana', 'Ivo', 'Jun'];
	const LAST = ['Rao', 'Khan', 'Mehta', 'Singh', 'Das', 'Nair', 'Roy', 'Shah'];

	/** mulberry32: the same rows on every load, so a perf run compares like with like. */
	function seeded(seed: number): () => number {
		let a = seed;
		return () => {
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	const pick = <V,>(rand: () => number, list: V[]): V =>
		list[Math.floor(rand() * list.length)] as V;

	const rand = seeded(20261123);
	const rows: Row[] = Array.from({ length: COUNT }, (_, i) => {
		const first = pick(rand, FIRST);
		const last = pick(rand, LAST);
		const day = 1 + Math.floor(rand() * 28);
		return {
			id: `r-${i + 1}`,
			name: `${first} ${last} ${i + 1}`,
			email: `${first}.${last}.${i + 1}@bench.test`.toLowerCase(),
			role: pick(rand, ROLES),
			region: pick(rand, REGIONS),
			status: pick(rand, STATUSES),
			score: Math.floor(rand() * 1000),
			subtitle: (i + 1) % 5 === 0 ? `${first}.${last}@bench.test`.toLowerCase() : undefined,
			note:
				(i + 1) % 7 === 0
					? 'A long note that does not fit on one line and wraps onto a second and a third line in a narrow column.'
					: 'ok',
			joined: `2026-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(day).padStart(2, '0')}`
		};
	});

	const columns: DataTableColumn<Row>[] = [
		{ id: 'name', header: 'Name', accessor: (r) => r.name, sortable: true, cell: nameCell },
		{ id: 'email', header: 'Email', accessor: (r) => r.email, sortable: true },
		{ id: 'role', header: 'Role', accessor: (r) => r.role, sortable: true },
		{ id: 'region', header: 'Region', accessor: (r) => r.region, sortable: true },
		{ id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
		{ id: 'score', header: 'Score', accessor: (r) => r.score, sortable: true, align: 'end' },
		{ id: 'joined', header: 'Joined', accessor: (r) => r.joined, sortable: true },
		{ id: 'note', header: 'Note', accessor: (r) => r.note, cell: noteCell, class: 'w-56' },
		{ id: 'id', header: 'Id', accessor: (r) => r.id }
	];

	let density = $state<'compact' | 'default'>('compact');
	const selection = createBulkSelection<Row>();
	const nav = createKeyboardListNav<Row>({ onToggleSelect: (row) => selection.toggle(row.id) });
	const prefs = getPreferences();
</script>

{#snippet nameCell(r: Row)}
	<IdentityCell name={r.name} subtitle={r.subtitle} size="sm" />
{/snippet}

{#snippet noteCell(r: Row)}
	<span class="whitespace-normal">{r.note}</span>
{/snippet}

<svelte:head>
	<title>DataTable bench</title>
</svelte:head>

<main id="main-content" class="stack stack-relaxed p-6">
	<PageHeader title="DataTable bench" crumbs={[]} />
	<div class="cluster" role="group" aria-label="Transparency">
		{#each PREFERENCE_VALUES.transparency as value (value)}
			<Button
				variant={prefs.transparency === value ? 'default' : 'outline'}
				size="sm"
				aria-pressed={prefs.transparency === value}
				onclick={() => prefs.set({ transparency: value })}
			>
				{value}
			</Button>
		{/each}
	</div>
	<div class="cluster" role="group" aria-label="Density">
		{#each ['compact', 'default'] as const as value (value)}
			<Button
				variant={density === value ? 'default' : 'outline'}
				size="sm"
				aria-pressed={density === value}
				onclick={() => (density = value)}
			>
				{value}
			</Button>
		{/each}
	</div>
	<p class="text-muted-foreground text-sm" aria-live="polite">{selection.count} selected</p>
	<DataTable
		{columns}
		data={rows}
		getRowId={(r) => r.id}
		noun="rows"
		caption="Bench rows"
		sorting={{ mode: 'client' }}
		selection={{ mode: 'multi', state: selection, rowLabel: (r) => `Select ${r.name}` }}
		{nav}
		{density}
	/>
</main>
