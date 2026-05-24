<!--
	InvoiceCard — shows the FY-aware invoice number, totals, and status
	once the order has reached invoice_generated. Renders nothing when
	`invoice` is null so the parent can compose without conditionals.
-->
<script lang="ts">
	import { Badge, Card } from '$ui';
	import { formatMoney, longDate } from '$features/orders/view-models';
	import type { InvoiceDto } from '$features/orders/schemas';

	type Props = {
		invoice: InvoiceDto | null | undefined;
		currency?: string;
	};
	let { invoice, currency = 'INR' }: Props = $props();
</script>

{#if invoice}
	<Card.Root data-testid="invoice-card">
		<Card.Header>
			<div class="cluster cluster-spread items-start">
				<div class="stack stack-tight">
					<Card.Title>Invoice {invoice.invoice_number}</Card.Title>
					<p class="caption text-fg-muted">
						FY {invoice.fy} · Generated {longDate(invoice.generated_at)}
					</p>
				</div>
				<Badge
					variant={invoice.status === 'active' ? 'success' : 'danger'}
					appearance="soft"
					size="sm"
				>
					{invoice.status === 'active' ? 'Active' : 'Cancelled'}
				</Badge>
			</div>
		</Card.Header>
		<Card.Content>
			<dl class="text-fg flex flex-col gap-1 text-sm tabular-nums">
				<div class="cluster cluster-spread">
					<dt class="text-fg-muted">Taxable</dt>
					<dd>{formatMoney(invoice.taxable_total, currency)}</dd>
				</div>
				<div class="cluster cluster-spread">
					<dt class="text-fg-muted">GST</dt>
					<dd>{formatMoney(invoice.gst_total, currency)}</dd>
				</div>
				<div class="border-border cluster cluster-spread border-t pt-2">
					<dt class="label text-fg">Grand total</dt>
					<dd class="label text-fg" data-testid="invoice-grand-total">
						{formatMoney(invoice.grand_total, currency)}
					</dd>
				</div>
			</dl>
			{#if invoice.cancellation_reason}
				<p class="caption text-danger-700 mt-3">
					Cancelled: {invoice.cancellation_reason}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
{:else}
	<p class="caption text-fg-muted py-4">Invoice not yet generated.</p>
{/if}
