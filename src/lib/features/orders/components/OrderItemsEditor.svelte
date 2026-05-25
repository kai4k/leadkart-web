<!--
	OrderItemsEditor — line-items editor used inside ReviseQuotationDrawer
	and (future) CreateQuotationDrawer. Each row has:
	  - Combobox to pick product + batch (server-search via onInput)
	  - NumberInput for quantity
	  - NumberInput for unit_price (with inline price-band warning)
	  - NumberInput for discount_percentage
	  - Computed line total
	Live order totals appear under the table.

	The editor stores draft rows as plain objects; the parent serialises
	to the `CreateOrderItem` shape on submit. Catalogue (batch → sale_rate
	+ gst_percentage + brand label) is supplied by the parent so this
	component stays stateless on the network.
-->
<script lang="ts">
	import { Alert, Button } from '$ui';
	import { Combobox, NumberInput } from '$form';
	import { Icon, Plus, X } from '$icons';
	import {
		checkPriceBand,
		computeLineTotal,
		computeOrderTotals,
		formatMoney
	} from '$features/orders/view-models';
	import type { ComboboxOption } from '$lib/components/form/Combobox.svelte';

	export interface BatchCatalogueEntry {
		/** Composite "product_id:batch_id" — the value emitted by the combobox option. */
		value: string;
		product_id: string;
		batch_id: string;
		label: string;
		description?: string;
		sale_rate: number;
		gst_percentage: number;
	}

	export interface DraftItem {
		product_id: string;
		batch_id: string;
		quantity: number;
		unit_price: number;
		/** Internally normalised to 0 instead of undefined so the
		 * NumberInput can two-way bind without a stale-undefined trip. */
		discount_percentage: number;
	}

	type Props = {
		items: DraftItem[];
		catalogue: ReadonlyArray<BatchCatalogueEntry>;
		currency?: string;
		onSearch?: (query: string) => void;
		bannerError?: string | null;
	};

	let {
		items = $bindable<DraftItem[]>([]),
		catalogue,
		currency = 'INR',
		onSearch,
		bannerError = null
	}: Props = $props();

	const catalogueByBatch = $derived(
		Object.fromEntries(catalogue.map((b) => [b.batch_id, b])) as Record<string, BatchCatalogueEntry>
	);

	const options: ComboboxOption[] = $derived(
		catalogue.map((b) => ({ value: b.value, label: b.label, description: b.description }))
	);

	function entryFromValue(v: string): BatchCatalogueEntry | undefined {
		return catalogue.find((b) => b.value === v);
	}

	function comboValueFor(row: DraftItem): string {
		if (!row.product_id || !row.batch_id) return '';
		return `${row.product_id}:${row.batch_id}`;
	}

	function addRow() {
		items = [
			...items,
			{
				product_id: '',
				batch_id: '',
				quantity: 1,
				unit_price: 0,
				discount_percentage: 0
			}
		];
	}

	function removeRow(idx: number) {
		items = items.filter((_, i) => i !== idx);
	}

	function onBatchPicked(idx: number, value: string) {
		const entry = entryFromValue(value);
		if (!entry) return;
		const row = items[idx];
		if (!row) return;
		items = items.map((it, i) =>
			i === idx
				? {
						...it,
						product_id: entry.product_id,
						batch_id: entry.batch_id,
						unit_price: it.unit_price > 0 ? it.unit_price : entry.sale_rate
					}
				: it
		);
	}

	const totals = $derived(
		computeOrderTotals(
			items.map((it) => ({
				product_id: it.product_id,
				batch_id: it.batch_id,
				quantity: it.quantity,
				unit_price: it.unit_price,
				discount_percentage: it.discount_percentage
			})),
			Object.fromEntries(
				Object.entries(catalogueByBatch).map(([id, b]) => [
					id,
					{ gst_percentage: b.gst_percentage }
				])
			)
		)
	);
</script>

<div class="stack stack-relaxed" data-testid="order-items-editor">
	{#if bannerError}
		<Alert variant="danger" title="Couldn't save">{bannerError}</Alert>
	{/if}

	<div class="stack stack-relaxed">
		{#each items as row, idx (idx)}
			{@const cat = row.batch_id ? catalogueByBatch[row.batch_id] : undefined}
			{@const band = cat ? checkPriceBand(row.unit_price, cat.sale_rate) : null}
			{@const lineTotals = computeLineTotal({
				quantity: row.quantity,
				unit_price: row.unit_price,
				discount_percentage: row.discount_percentage,
				gst_percentage: cat?.gst_percentage ?? 0
			})}
			<div
				class="border-border bg-bg-elevated stack stack-tight rounded-md border p-3"
				data-testid={`line-${idx}`}
			>
				<div class="grid grid-cols-1 gap-3 md:grid-cols-12">
					<div class="md:col-span-5">
						<Combobox
							label="Product · batch"
							value={comboValueFor(row)}
							{options}
							onValueChange={(v) => onBatchPicked(idx, v)}
							onInput={onSearch}
							placeholder="Search brand or batch…"
							srLabel={idx > 0}
						/>
					</div>
					<div class="md:col-span-2" data-testid={`line-${idx}-quantity`}>
						<NumberInput
							label="Qty"
							bind:value={items[idx].quantity}
							min={1}
							step={1}
							srLabel={idx > 0}
						/>
					</div>
					<div class="md:col-span-2" data-testid={`line-${idx}-unit-price`}>
						<NumberInput
							label="Unit ₹"
							bind:value={items[idx].unit_price}
							min={0}
							step={1}
							precision={2}
							srLabel={idx > 0}
						/>
					</div>
					<div class="md:col-span-2">
						<NumberInput
							label="Disc %"
							bind:value={items[idx].discount_percentage}
							min={0}
							max={100}
							step={1}
							precision={2}
							srLabel={idx > 0}
						/>
					</div>
					<div class="text-fg-muted body-sm flex items-end justify-between md:col-span-1">
						<button
							type="button"
							class="text-fg-muted hover:text-danger-700 mb-2 inline-flex items-center"
							aria-label="Remove line"
							onclick={() => removeRow(idx)}
							data-testid={`line-${idx}-remove`}
						>
							<Icon icon={X} size="sm" />
						</button>
					</div>
				</div>

				<div class="cluster cluster-spread">
					<div class="caption text-fg-muted tabular-nums">
						GST {cat?.gst_percentage ?? 0}% · net {formatMoney(lineTotals.net, currency)} · gst {formatMoney(
							lineTotals.gst,
							currency
						)}
					</div>
					<div class="body-sm text-fg tabular-nums">
						Line total <span class="font-semibold">{formatMoney(lineTotals.total, currency)}</span>
					</div>
				</div>

				{#if band && !band.ok}
					<Alert variant="warning" title="Outside ±10% price band">
						<span data-testid={`line-${idx}-price-band-warning`}>
							Sale rate ₹{cat?.sale_rate} · allowed range {formatMoney(band.min, currency)} – {formatMoney(
								band.max,
								currency
							)}. Server may reject with <code>price_outside_band</code>.
						</span>
					</Alert>
				{/if}
			</div>
		{/each}
	</div>

	<div class="cluster cluster-spread">
		<Button variant="ghost" onclick={addRow} data-testid="add-line">
			<Icon icon={Plus} size="sm" /> Add line
		</Button>
		<dl class="cluster cluster-tight text-fg body-sm tabular-nums" data-testid="editor-totals">
			<div class="cluster cluster-tight">
				<dt class="text-fg-muted">Subtotal</dt>
				<dd>{formatMoney(totals.subtotal, currency)}</dd>
			</div>
			<div class="cluster cluster-tight">
				<dt class="text-fg-muted">Discount</dt>
				<dd>−{formatMoney(totals.discount_total, currency)}</dd>
			</div>
			<div class="cluster cluster-tight">
				<dt class="text-fg-muted">GST</dt>
				<dd>{formatMoney(totals.gst_total, currency)}</dd>
			</div>
			<div class="cluster cluster-tight">
				<dt class="label text-fg">Total</dt>
				<dd class="label text-fg font-semibold" data-testid="editor-total">
					{formatMoney(totals.total, currency)}
				</dd>
			</div>
		</dl>
	</div>
</div>
