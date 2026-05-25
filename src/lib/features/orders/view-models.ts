/**
 * Pure view-model helpers for the orders feature. No async, no
 * side effects, no DOM access — these are pure transforms
 * (CLAUDE.md "ViewModel" layer).
 *
 * Owns the order state machine (`nextStatesFor`), per-action capability
 * predicates, money formatting, totals computation, and the
 * price-band check derived from a batch's `sale_rate`.
 */
import type { CreateOrderItem, OrderDto, OrderItemDto, OrderStatus } from './schemas';

// ── Status badge mapping ─────────────────────────────────────────────

export type StatusVariant = 'success' | 'danger' | 'warning' | 'neutral' | 'info' | 'brand';

export interface StatusBadge {
	label: string;
	variant: StatusVariant;
}

const STATUS_BADGES: Record<OrderStatus, StatusBadge> = {
	quotation_draft: { label: 'Draft quotation', variant: 'neutral' },
	quotation_revised: { label: 'Revised', variant: 'warning' },
	quotation_approved: { label: 'Approved', variant: 'info' },
	token_payment_received: { label: 'Token received', variant: 'info' },
	confirmed: { label: 'Confirmed', variant: 'brand' },
	packed: { label: 'Packed', variant: 'brand' },
	invoice_generated: { label: 'Invoiced', variant: 'brand' },
	dispatched: { label: 'Dispatched', variant: 'brand' },
	delivered: { label: 'Delivered', variant: 'success' },
	complete: { label: 'Complete', variant: 'success' },
	cancelled: { label: 'Cancelled', variant: 'danger' }
};

export function statusBadge(status: OrderStatus): StatusBadge {
	return STATUS_BADGES[status] ?? { label: status, variant: 'neutral' };
}

// ── Order state machine ──────────────────────────────────────────────

/**
 * Per-state legal next transitions. Pre-confirm states can fall back
 * to `quotation_revised` via revise + `cancelled` after confirm.
 * Encodes the full BRD lifecycle so `OrderActionButtons` only renders
 * legal buttons.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	quotation_draft: ['quotation_revised', 'quotation_approved'],
	quotation_revised: ['quotation_revised', 'quotation_approved'],
	quotation_approved: ['token_payment_received'],
	token_payment_received: ['confirmed'],
	confirmed: ['packed', 'cancelled'],
	packed: ['invoice_generated', 'cancelled'],
	invoice_generated: ['dispatched', 'cancelled'],
	dispatched: ['delivered', 'cancelled'],
	delivered: ['complete', 'cancelled'],
	complete: [],
	cancelled: []
};

/** Returns the legal next states for an order in the given status. */
export function nextStatesFor(status: OrderStatus): OrderStatus[] {
	return TRANSITIONS[status] ?? [];
}

export function canTransitionTo(from: OrderStatus, to: OrderStatus): boolean {
	return nextStatesFor(from).includes(to);
}

// ── Per-action capability predicates ─────────────────────────────────

export function canRevise(status: OrderStatus): boolean {
	return status === 'quotation_draft' || status === 'quotation_revised';
}

export function canApprove(status: OrderStatus): boolean {
	return status === 'quotation_draft' || status === 'quotation_revised';
}

export function canRecordTokenPayment(status: OrderStatus): boolean {
	return status === 'quotation_approved';
}

export function canConfirm(status: OrderStatus): boolean {
	return status === 'token_payment_received';
}

export function canMarkPacked(status: OrderStatus): boolean {
	return status === 'confirmed';
}

export function canGenerateInvoice(status: OrderStatus): boolean {
	return status === 'packed';
}

export function canDispatch(status: OrderStatus): boolean {
	return status === 'invoice_generated';
}

export function canMarkDelivered(status: OrderStatus): boolean {
	return status === 'dispatched';
}

export function canRecordFullPayment(order: OrderDto): boolean {
	if (order.status !== 'delivered') return false;
	// Already received full payment? Don't show again.
	return !order.payments.some((p) => p.kind === 'full');
}

export function canComplete(order: OrderDto): boolean {
	if (order.status !== 'delivered') return false;
	return order.payments.some((p) => p.kind === 'full');
}

export function canCancel(status: OrderStatus): boolean {
	// Per spec — cancellation allowed from any post-confirm state up to delivered.
	return (
		status === 'confirmed' ||
		status === 'packed' ||
		status === 'invoice_generated' ||
		status === 'dispatched' ||
		status === 'delivered'
	);
}

/** Editable notes-only via PATCH; line items via /revise. */
export function canEditNotes(status: OrderStatus): boolean {
	return status !== 'cancelled' && status !== 'complete';
}

/** Only quotation_draft orders can be hard-deleted; everything else uses cancel. */
export function canDelete(status: OrderStatus): boolean {
	return status === 'quotation_draft';
}

// ── Stepper position ─────────────────────────────────────────────────

export type StepperLifecycleState = 'pending' | 'current' | 'complete' | 'error';

export interface LifecycleStep {
	id: OrderStatus;
	label: string;
	state: StepperLifecycleState;
}

/**
 * Canonical 10-state happy-path ladder used by the lifecycle stepper.
 * Cancellation isn't a step — it surfaces as `error` on the step where
 * cancellation happened.
 */
const LIFECYCLE_ORDER: OrderStatus[] = [
	'quotation_draft',
	'quotation_revised',
	'quotation_approved',
	'token_payment_received',
	'confirmed',
	'packed',
	'invoice_generated',
	'dispatched',
	'delivered',
	'complete'
];

const LIFECYCLE_LABELS: Record<OrderStatus, string> = {
	quotation_draft: 'Draft',
	quotation_revised: 'Revised',
	quotation_approved: 'Approved',
	token_payment_received: 'Token',
	confirmed: 'Confirmed',
	packed: 'Packed',
	invoice_generated: 'Invoiced',
	dispatched: 'Dispatched',
	delivered: 'Delivered',
	complete: 'Complete',
	cancelled: 'Cancelled'
};

/**
 * Computes the lifecycle stepper view for the current order. The step
 * matching `status` is `current`; earlier steps `complete`; later
 * steps `pending`. When the order is `cancelled`, the step where
 * cancellation occurred is `error` and all earlier steps stay
 * `complete`.
 */
export function lifecycleStepsFor(order: OrderDto): LifecycleStep[] {
	const status = order.status;
	const cancelledIdx = inferCancelledStepIndex(order);
	const isCancelled = status === 'cancelled';
	const currentIdx = isCancelled ? cancelledIdx : LIFECYCLE_ORDER.indexOf(status);

	return LIFECYCLE_ORDER.map((s, idx) => {
		let state: StepperLifecycleState;
		if (isCancelled && idx === currentIdx) state = 'error';
		else if (idx < currentIdx) state = 'complete';
		else if (idx === currentIdx) state = 'current';
		else state = 'pending';
		return { id: s, label: LIFECYCLE_LABELS[s], state };
	});
}

/**
 * Best-effort guess of the step where cancellation happened, based on
 * which lifecycle timestamps are set. Used purely for stepper display.
 */
function inferCancelledStepIndex(order: OrderDto): number {
	if (order.delivered_at) return LIFECYCLE_ORDER.indexOf('delivered');
	if (order.dispatched_at) return LIFECYCLE_ORDER.indexOf('dispatched');
	if (order.invoice_generated_at) return LIFECYCLE_ORDER.indexOf('invoice_generated');
	if (order.packed_at) return LIFECYCLE_ORDER.indexOf('packed');
	if (order.confirmed_at) return LIFECYCLE_ORDER.indexOf('confirmed');
	if (order.quotation_approved_at) return LIFECYCLE_ORDER.indexOf('quotation_approved');
	return 0;
}

// ── Currency formatting ──────────────────────────────────────────────

export function formatMoney(amount: number, currency = 'INR'): string {
	try {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency,
			minimumFractionDigits: 2
		}).format(amount);
	} catch {
		return `${currency} ${amount.toFixed(2)}`;
	}
}

// ── Line-item totals ─────────────────────────────────────────────────

/**
 * Computes line totals for a single item:
 *   gross           = quantity * unit_price
 *   discount_value  = gross * discount_percentage / 100
 *   net             = gross - discount_value
 *   gst_value       = net * gst_percentage / 100
 *   line_total      = net + gst_value
 *
 * `discount_percentage` and `gst_percentage` are PERCENTAGES (10 = 10%),
 * matching the DTO contract. Result is rounded to 2 decimal places.
 */
export function computeLineTotal(item: {
	quantity: number;
	unit_price: number;
	discount_percentage?: number;
	gst_percentage?: number;
}): { net: number; gst: number; total: number } {
	const gross = item.quantity * item.unit_price;
	const discount = gross * ((item.discount_percentage ?? 0) / 100);
	const net = Math.max(0, gross - discount);
	const gst = net * ((item.gst_percentage ?? 0) / 100);
	return {
		net: round2(net),
		gst: round2(gst),
		total: round2(net + gst)
	};
}

export interface OrderTotals {
	subtotal: number;
	discount_total: number;
	gst_total: number;
	total: number;
}

/**
 * Aggregate totals from a draft list of line items + the catalogue
 * `gst_percentage` they reference. Used live in the ReviseQuotationDrawer
 * before the server returns canonical totals.
 *
 * `catalogue` maps `batch_id` → `{ gst_percentage }` so a stale price
 * change on the catalogue doesn't pollute totals — the editor pins
 * gst at the moment the line was added.
 *
 * Accepts a structural superset of `CreateOrderItem` so tests can pass
 * minimal objects without the optional `discount_percentage`.
 */
export function computeOrderTotals(
	items: ReadonlyArray<
		Omit<CreateOrderItem, 'discount_percentage'> & { discount_percentage?: number }
	>,
	catalogue: Record<string, { gst_percentage: number }> = {}
): OrderTotals {
	let subtotal = 0;
	let discount_total = 0;
	let gst_total = 0;
	for (const it of items) {
		const gross = it.quantity * it.unit_price;
		const discount = gross * ((it.discount_percentage ?? 0) / 100);
		const net = Math.max(0, gross - discount);
		const gstPct = catalogue[it.batch_id]?.gst_percentage ?? 0;
		const gst = net * (gstPct / 100);
		subtotal += gross;
		discount_total += discount;
		gst_total += gst;
	}
	const total = subtotal - discount_total + gst_total;
	return {
		subtotal: round2(subtotal),
		discount_total: round2(discount_total),
		gst_total: round2(gst_total),
		total: round2(total)
	};
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

// ── Price-band check (BRD §6.4 ±10%) ─────────────────────────────────

export const PRICE_BAND_RATIO = 0.1; // default ±10%

export interface PriceBandCheck {
	ok: boolean;
	min: number;
	max: number;
	reason?: 'below_band' | 'above_band';
}

/**
 * Whether `unit_price` falls inside `[sale_rate × (1-ratio), sale_rate
 * × (1+ratio)]`. Returns the min/max bounds so the UI can render an
 * inline hint. `sale_rate <= 0` is treated as no-band-enforcement (the
 * catalogue is misconfigured — let the server reject).
 */
export function checkPriceBand(
	unit_price: number,
	sale_rate: number,
	ratio = PRICE_BAND_RATIO
): PriceBandCheck {
	if (!Number.isFinite(sale_rate) || sale_rate <= 0) {
		return { ok: true, min: 0, max: Number.POSITIVE_INFINITY };
	}
	const min = round2(sale_rate * (1 - ratio));
	const max = round2(sale_rate * (1 + ratio));
	if (unit_price < min) return { ok: false, min, max, reason: 'below_band' };
	if (unit_price > max) return { ok: false, min, max, reason: 'above_band' };
	return { ok: true, min, max };
}

// ── Misc helpers ─────────────────────────────────────────────────────

export function lineItemsLabel(items: ReadonlyArray<OrderItemDto>): string {
	const count = items.length;
	if (count === 0) return 'No items';
	if (count === 1) return '1 item';
	return `${count} items`;
}

export function shortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleDateString('en-IN');
	} catch {
		return '—';
	}
}

export function longDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString('en-IN');
	} catch {
		return '—';
	}
}

export function totalPaid(order: OrderDto): number {
	return round2(order.payments.reduce((acc, p) => acc + p.amount, 0));
}

export function outstandingBalance(order: OrderDto): number {
	return round2(Math.max(0, order.current_total - totalPaid(order)));
}
