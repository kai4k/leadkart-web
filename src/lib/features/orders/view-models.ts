/**
 * Pure view-model helpers for the orders feature. No async, no
 * side effects, no DOM access — these are pure transforms
 * (CLAUDE.md "ViewModel" layer).
 */
import type { CreateOrderItem, OrderDto, OrderItemDto, OrderStatus } from './schemas';

// ── Status badge mapping ─────────────────────────────────────────────

export interface StatusBadge {
	label: string;
	variant: 'success' | 'danger' | 'warning' | 'neutral' | 'info' | 'brand';
}

const STATUS_BADGES: Record<OrderStatus, StatusBadge> = {
	draft: { label: 'Draft', variant: 'neutral' },
	pending: { label: 'Pending', variant: 'warning' },
	confirmed: { label: 'Confirmed', variant: 'info' },
	shipped: { label: 'Shipped', variant: 'brand' },
	delivered: { label: 'Delivered', variant: 'success' },
	cancelled: { label: 'Cancelled', variant: 'neutral' },
	refunded: { label: 'Refunded', variant: 'danger' }
};

export function statusBadge(status: OrderStatus): StatusBadge {
	return STATUS_BADGES[status] ?? { label: status, variant: 'info' };
}

// ── Status transition diagram ────────────────────────────────────────

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	draft: ['confirmed', 'cancelled'],
	pending: ['confirmed', 'cancelled'],
	confirmed: ['shipped', 'cancelled'],
	shipped: ['delivered'],
	delivered: ['refunded'],
	cancelled: [],
	refunded: []
};

/**
 * Returns the legal next states for an order in the given status.
 * Used by `OrderStatusActions` to render only the buttons that are
 * actually valid (mirrors backend's 422 invalid_status_transition).
 */
export function nextStatesFor(status: OrderStatus): OrderStatus[] {
	return TRANSITIONS[status] ?? [];
}

export function canTransitionTo(from: OrderStatus, to: OrderStatus): boolean {
	return nextStatesFor(from).includes(to);
}

/** Editable only while not yet committed to fulfillment. */
export function canEdit(status: OrderStatus): boolean {
	return status === 'draft' || status === 'pending';
}

/** Only draft orders can be hard-deleted; everything else uses cancel. */
export function canDelete(status: OrderStatus): boolean {
	return status === 'draft';
}

// ── Currency formatting ──────────────────────────────────────────────

export function formatMoney(amount: number, currency = 'USD'): string {
	try {
		return new Intl.NumberFormat(undefined, {
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
 * Computes line_total for a single item using the canonical formula:
 *   gross  = quantity * unit_price
 *   net    = gross - discount
 *   taxed  = net * (1 + tax_rate)
 *
 * `tax_rate` is decimal (0.08 = 8%). Both `discount` and `tax_rate`
 * default to 0 if undefined. Result is rounded to 2 decimal places.
 */
export function computeLineTotal(item: {
	quantity: number;
	unit_price: number;
	discount?: number;
	tax_rate?: number;
}): number {
	const gross = item.quantity * item.unit_price;
	const net = Math.max(0, gross - (item.discount ?? 0));
	const taxed = net * (1 + (item.tax_rate ?? 0));
	return round2(taxed);
}

export interface OrderTotals {
	subtotal: number;
	discount_total: number;
	tax_total: number;
	total: number;
}

/**
 * Aggregate totals from a draft list of items (used during create/edit
 * before the server has issued canonical totals).
 */
export function computeOrderTotals(items: CreateOrderItem[]): OrderTotals {
	let subtotal = 0;
	let discount_total = 0;
	let tax_total = 0;
	for (const it of items) {
		const gross = it.quantity * it.unit_price;
		const discount = it.discount ?? 0;
		const net = Math.max(0, gross - discount);
		const tax = net * (it.tax_rate ?? 0);
		subtotal += gross;
		discount_total += discount;
		tax_total += tax;
	}
	const total = subtotal - discount_total + tax_total;
	return {
		subtotal: round2(subtotal),
		discount_total: round2(discount_total),
		tax_total: round2(tax_total),
		total: round2(total)
	};
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

// ── Misc helpers ─────────────────────────────────────────────────────

export function lineItemsLabel(items: OrderItemDto[]): string {
	const count = items.length;
	if (count === 0) return 'No items';
	if (count === 1) return '1 item';
	return `${count} items`;
}

export function shortDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleDateString();
	} catch {
		return '—';
	}
}

export function longDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return '—';
	}
}

/** Aggregate `total_count` from a list of orders for the BulkActionsBar. */
export function selectionTotals(orders: OrderDto[], selectedIds: Set<string>): OrderTotals {
	let subtotal = 0;
	let discount_total = 0;
	let tax_total = 0;
	let total = 0;
	for (const o of orders) {
		if (!selectedIds.has(o.id)) continue;
		subtotal += o.subtotal;
		discount_total += o.discount_total ?? 0;
		tax_total += o.tax_total;
		total += o.total;
	}
	return {
		subtotal: round2(subtotal),
		discount_total: round2(discount_total),
		tax_total: round2(tax_total),
		total: round2(total)
	};
}

/**
 * Saved views — fixed set per the spec. Each view encodes a set of
 * URL params the list page sets when picked.
 */
export type SavedViewId = 'all' | 'draft' | 'awaiting_shipment' | 'in_transit' | 'last_30_days';

export interface SavedView {
	id: SavedViewId;
	label: string;
	params: Record<string, string | string[]>;
}

export const SAVED_VIEWS: SavedView[] = [
	{ id: 'all', label: 'All', params: {} },
	{ id: 'draft', label: 'Drafts', params: { status: ['draft'] } },
	{
		id: 'awaiting_shipment',
		label: 'Awaiting shipment',
		params: { status: ['confirmed'] }
	},
	{ id: 'in_transit', label: 'In transit', params: { status: ['shipped'] } },
	{
		id: 'last_30_days',
		label: 'Last 30 days',
		params: { placed_from: thirtyDaysAgoIso() }
	}
];

function thirtyDaysAgoIso(): string {
	const d = new Date();
	d.setDate(d.getDate() - 30);
	return d.toISOString();
}
