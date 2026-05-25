<script lang="ts">
	import { BulkUploadDrawer } from '$lib/components/data';
	import { bulkUploadPreview, bulkUploadCommit } from '$features/inventory/api';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { inventoryKeys } from '$features/inventory/queries';
	import type { BulkUploadPreview, BulkUploadResult } from '$features/inventory/schemas';

	/**
	 * Product bulk upload — three-step (upload → preview → commit) drawer.
	 *
	 * Upsert key per BRD §6.5: `(brand_name, manufacturer_name, pack_size,
	 * pack_type)` — server-enforced via composite unique index. The UI
	 * surfaces this as the `product_key` upsert option.
	 */
	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	const qc = useQueryClient();

	async function previewFn(file: File): Promise<BulkUploadPreview> {
		return bulkUploadPreview(file);
	}

	async function commitFn(file: File, opts?: { upsert_by?: string }): Promise<BulkUploadResult> {
		return bulkUploadCommit(file, {
			upsert_by: (opts?.upsert_by as 'product_key' | 'none' | undefined) ?? 'product_key'
		});
	}

	function onComplete() {
		qc.invalidateQueries({ queryKey: inventoryKeys.productLists() });
	}
</script>

<BulkUploadDrawer
	bind:open
	{onOpenChange}
	title="Bulk upload products"
	description="Upsert pharma products by (brand_name, manufacturer_name, pack_size, pack_type)."
	accept=".csv,.xlsx"
	{previewFn}
	{commitFn}
	upsertOptions={[
		{ value: 'product_key', label: 'Upsert by product key' },
		{ value: 'none', label: 'Insert only' }
	]}
	{onComplete}
/>
