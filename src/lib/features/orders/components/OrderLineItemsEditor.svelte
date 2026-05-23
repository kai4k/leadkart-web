<script lang="ts">
	import { Button } from '$ui';
	import { Icon, Plus, Trash2 } from '$icons';
	import { computeLineTotal, formatMoney } from '$features/orders/view-models';
	import type { CreateOrderItem } from '$features/orders/schemas';

	type Props = {
		items: CreateOrderItem[];
		currency?: string;
		onChange: (next: CreateOrderItem[]) => void;
		error?: string | null;
		disabled?: boolean;
	};

	let { items, currency = 'USD', onChange, error = null, disabled = false }: Props = $props();

	function update(idx: number, patch: Partial<CreateOrderItem>) {
		const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
		onChange(next);
	}

	function addLine() {
		onChange([
			...items,
			{
				sku: '',
				name: '',
				quantity: 1,
				unit_price: 0,
				discount: 0,
				tax_rate: 0
			}
		]);
	}

	function removeLine(idx: number) {
		onChange(items.filter((_, i) => i !== idx));
	}

	function parseNumber(v: string): number {
		const n = parseFloat(v);
		return Number.isFinite(n) ? n : 0;
	}
	function parseInt10(v: string): number {
		const n = parseInt(v, 10);
		return Number.isFinite(n) && n >= 1 ? n : 1;
	}
</script>

<div class="stack stack-tight" data-testid="line-items-editor">
	<div class="cluster cluster-spread">
		<span class="label text-fg">Line items</span>
		{#if error}
			<span class="caption text-danger-700" data-testid="line-items-error">{error}</span>
		{/if}
	</div>

	{#if items.length === 0}
		<p class="caption text-fg-subtle">No line items yet. Click "Add line" to begin.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead>
					<tr class="border-border text-fg-muted border-b">
						<th class="px-2 py-2 text-xs font-medium tracking-wide uppercase">SKU</th>
						<th class="hidden px-2 py-2 text-xs font-medium tracking-wide uppercase md:table-cell"
							>Name</th
						>
						<th class="px-2 py-2 text-right text-xs font-medium tracking-wide uppercase">Qty</th>
						<th class="px-2 py-2 text-right text-xs font-medium tracking-wide uppercase">Price</th>
						<th class="px-2 py-2 text-right text-xs font-medium tracking-wide uppercase">Line</th>
						<th class="w-8 px-2 py-2"><span class="sr-only">Remove</span></th>
					</tr>
				</thead>
				<tbody>
					{#each items as item, idx (idx)}
						{@const lineTotal = computeLineTotal(item)}
						<tr class="border-border border-b">
							<td class="px-2 py-2">
								<input
									type="text"
									class="glass-input w-full rounded-md px-2 py-1.5 text-sm"
									aria-label={`SKU for line ${idx + 1}`}
									data-testid={`line-${idx}-sku`}
									value={item.sku}
									oninput={(e) => update(idx, { sku: (e.target as HTMLInputElement).value })}
									{disabled}
									required
								/>
							</td>
							<td class="hidden px-2 py-2 md:table-cell">
								<input
									type="text"
									class="glass-input w-full rounded-md px-2 py-1.5 text-sm"
									aria-label={`Name for line ${idx + 1}`}
									data-testid={`line-${idx}-name`}
									value={item.name ?? ''}
									oninput={(e) => update(idx, { name: (e.target as HTMLInputElement).value })}
									{disabled}
								/>
							</td>
							<td class="px-2 py-2 text-right">
								<input
									type="number"
									min="1"
									step="1"
									class="glass-input w-20 rounded-md px-2 py-1.5 text-right text-sm"
									aria-label={`Quantity for line ${idx + 1}`}
									data-testid={`line-${idx}-quantity`}
									value={item.quantity}
									oninput={(e) =>
										update(idx, { quantity: parseInt10((e.target as HTMLInputElement).value) })}
									{disabled}
								/>
							</td>
							<td class="px-2 py-2 text-right">
								<input
									type="number"
									min="0"
									step="0.01"
									class="glass-input w-24 rounded-md px-2 py-1.5 text-right text-sm"
									aria-label={`Unit price for line ${idx + 1}`}
									data-testid={`line-${idx}-unit-price`}
									value={item.unit_price}
									oninput={(e) =>
										update(idx, {
											unit_price: parseNumber((e.target as HTMLInputElement).value)
										})}
									{disabled}
								/>
							</td>
							<td class="text-fg px-2 py-2 text-right tabular-nums">
								{formatMoney(lineTotal, currency)}
							</td>
							<td class="px-2 py-2 text-right">
								<button
									type="button"
									class="text-fg-muted hover:text-danger-700 focus-visible:ring-focus-ring rounded p-1 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
									aria-label={`Remove line ${idx + 1}`}
									data-testid={`line-${idx}-remove`}
									onclick={() => removeLine(idx)}
									{disabled}
								>
									<Icon icon={Trash2} size="xs" />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<div>
		<Button type="button" variant="ghost" size="sm" onclick={addLine} {disabled}>
			<Icon icon={Plus} size="xs" /> Add line
		</Button>
	</div>
</div>
