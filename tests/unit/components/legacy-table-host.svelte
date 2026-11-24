<script lang="ts">
	import { DataTable } from '#lib/components/ui/index.ts';
	import type { BulkSelection } from '#lib/hooks/index.ts';
	import type { createLegacyTableControl, HostRow } from './legacy-table-control.svelte.ts';

	let {
		control,
		selection
	}: {
		control: ReturnType<typeof createLegacyTableControl>;
		selection: BulkSelection<HostRow>;
	} = $props();
</script>

<DataTable.Root
	columns={[
		{ id: 'select', header: '' },
		{ id: 'name', header: 'Name', accessor: 'name' }
	]}
	rows={control.rows}
	rowKey={(r) => r.id}
	state={control.state}
	{selection}
/>
