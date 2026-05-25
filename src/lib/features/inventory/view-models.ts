/**
 * Pure view-model helpers for the inventory module.
 * No async, no side effects, no DOM access — every function takes
 * a DTO (or primitives) + returns render-ready data.
 *
 * Pharma-specific: stock-level mapping, FEFO batch ordering,
 * expiry-status traffic-light, drug-schedule pill mapping, GST math.
 */
import type { BatchDto, DrugSchedule, ProductDto, StockMovementReason } from './schemas';

// ── Stock level ──────────────────────────────────────────────────────

export type StockLevel = 'in' | 'low' | 'out';

export interface StockLevelBadgeVm {
	level: StockLevel;
	label: string;
	variant: 'success' | 'warning' | 'danger';
}

/**
 * Low-stock threshold: products with total_quantity_available <= 10
 * are flagged "Low" (heuristic, no per-product reorder-point in the
 * BRD; server enforces canonical low_stock filter).
 */
export const LOW_STOCK_THRESHOLD = 10;

export function stockLevel(
	product: Pick<ProductDto, 'total_quantity_available'>,
	threshold = LOW_STOCK_THRESHOLD
): StockLevel {
	const qty = product.total_quantity_available;
	if (qty <= 0) return 'out';
	if (qty <= threshold) return 'low';
	return 'in';
}

export function stockLevelBadge(
	product: Pick<ProductDto, 'total_quantity_available'>,
	threshold = LOW_STOCK_THRESHOLD
): StockLevelBadgeVm {
	const level = stockLevel(product, threshold);
	switch (level) {
		case 'out':
			return { level, label: 'Out of stock', variant: 'danger' };
		case 'low':
			return { level, label: 'Low', variant: 'warning' };
		case 'in':
			return { level, label: 'In stock', variant: 'success' };
	}
}

// ── Active / inactive ────────────────────────────────────────────────

const ACTIVE_LABEL: Record<
	'active' | 'inactive',
	{ label: string; variant: 'success' | 'neutral' }
> = {
	active: { label: 'Active', variant: 'success' },
	inactive: { label: 'Inactive', variant: 'neutral' }
};

export function activeBadge(p: Pick<ProductDto, 'is_active'>) {
	return ACTIVE_LABEL[p.is_active ? 'active' : 'inactive'];
}

// ── Drug schedule ────────────────────────────────────────────────────

export interface DrugScheduleBadgeVm {
	label: string;
	variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

const DRUG_SCHEDULE_VM: Record<DrugSchedule, DrugScheduleBadgeVm> = {
	otc: { label: 'OTC', variant: 'success' },
	schedule_h: { label: 'Schedule H', variant: 'warning' },
	schedule_h1: { label: 'Schedule H1', variant: 'danger' },
	schedule_x: { label: 'Schedule X', variant: 'danger' },
	schedule_c: { label: 'Schedule C', variant: 'info' },
	not_applicable: { label: '—', variant: 'neutral' }
};

export function drugScheduleBadge(s: DrugSchedule): DrugScheduleBadgeVm {
	return DRUG_SCHEDULE_VM[s] ?? { label: s, variant: 'neutral' };
}

export const DRUG_SCHEDULE_OPTIONS: ReadonlyArray<{ value: DrugSchedule; label: string }> = [
	{ value: 'otc', label: 'OTC' },
	{ value: 'schedule_h', label: 'Schedule H' },
	{ value: 'schedule_h1', label: 'Schedule H1' },
	{ value: 'schedule_x', label: 'Schedule X' },
	{ value: 'schedule_c', label: 'Schedule C' },
	{ value: 'not_applicable', label: 'Not applicable' }
];

// ── Expiry status ────────────────────────────────────────────────────

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'fresh';

export interface ExpiryStatusVm {
	status: ExpiryStatus;
	label: string;
	variant: 'success' | 'warning' | 'danger';
	daysUntilExpiry: number;
}

/**
 * Days from today to the expiry date. Negative = already expired.
 * Pure: caller passes `now` to keep tests deterministic.
 */
export function daysUntilExpiry(expiresAt: string, now: Date = new Date()): number {
	const expiry = new Date(expiresAt).getTime();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	return Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
}

export function expiryStatus(
	expiresAt: string | null | undefined,
	now: Date = new Date()
): ExpiryStatusVm | null {
	if (!expiresAt) return null;
	const days = daysUntilExpiry(expiresAt, now);
	if (days < 0) {
		return { status: 'expired', label: 'Expired', variant: 'danger', daysUntilExpiry: days };
	}
	if (days < 30) {
		return {
			status: 'critical',
			label: `Expires in ${days}d`,
			variant: 'danger',
			daysUntilExpiry: days
		};
	}
	if (days < 90) {
		return {
			status: 'warning',
			label: `Expires in ${days}d`,
			variant: 'warning',
			daysUntilExpiry: days
		};
	}
	return {
		status: 'fresh',
		label: `Expires in ${days}d`,
		variant: 'success',
		daysUntilExpiry: days
	};
}

// ── FEFO ─────────────────────────────────────────────────────────────

/**
 * First-Expiry-First-Out ordering for batches.
 *
 * Sort by `expires_at` ascending — quarantined & written-off batches
 * are pushed to the bottom (they shouldn't be consumed for sale).
 * Stable on `id` to keep render-key churn minimal.
 */
export function fefoSort<
	T extends Pick<BatchDto, 'expires_at' | 'is_quarantined' | 'is_written_off' | 'id'>
>(batches: ReadonlyArray<T>): T[] {
	return [...batches].sort((a, b) => {
		const aHidden = a.is_quarantined || a.is_written_off ? 1 : 0;
		const bHidden = b.is_quarantined || b.is_written_off ? 1 : 0;
		if (aHidden !== bHidden) return aHidden - bHidden;
		const ax = new Date(a.expires_at).getTime();
		const bx = new Date(b.expires_at).getTime();
		if (ax !== bx) return ax - bx;
		return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
	});
}

// ── Price math ───────────────────────────────────────────────────────

export function computePriceWithGst(baseRate: number, gstPercentage: number): number {
	if (baseRate < 0 || gstPercentage < 0) return baseRate;
	return Math.round(baseRate * (1 + gstPercentage / 100) * 100) / 100;
}

/** Format a price as INR (no currency code prop — pharma is single-currency for v0.1). */
export function formatPrice(amount: number, currency = 'INR'): string {
	try {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency,
			maximumFractionDigits: 2
		}).format(amount);
	} catch {
		return `${currency} ${amount.toFixed(2)}`;
	}
}

// ── Stock movement reason labels ─────────────────────────────────────

const MOVEMENT_REASON_LABELS: Record<StockMovementReason, string> = {
	inward: 'Inward',
	sale: 'Sale',
	sale_cancelled: 'Sale cancelled',
	damage: 'Damage',
	expired: 'Expired',
	transfer_in: 'Transfer in',
	transfer_out: 'Transfer out',
	correction: 'Correction',
	opening_balance: 'Opening balance'
};

export function movementReasonLabel(reason: StockMovementReason): string {
	return MOVEMENT_REASON_LABELS[reason] ?? reason;
}

const MOVEMENT_REASON_ACCENT: Record<
	StockMovementReason,
	'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
	inward: 'success',
	sale: 'info',
	sale_cancelled: 'warning',
	damage: 'danger',
	expired: 'danger',
	transfer_in: 'success',
	transfer_out: 'info',
	correction: 'neutral',
	opening_balance: 'primary'
};

export function movementReasonAccent(reason: StockMovementReason) {
	return MOVEMENT_REASON_ACCENT[reason] ?? 'neutral';
}

export const MANUAL_ADJUSTMENT_REASONS: ReadonlyArray<{
	value: StockMovementReason;
	label: string;
}> = [
	{ value: 'correction', label: 'Correction' },
	{ value: 'damage', label: 'Damage' },
	{ value: 'expired', label: 'Expired' },
	{ value: 'transfer_in', label: 'Transfer in' },
	{ value: 'transfer_out', label: 'Transfer out' }
];

// ── Misc helpers ─────────────────────────────────────────────────────

export function previewNewBalance(currentAvailable: number, delta: number): number {
	return Math.max(0, currentAvailable + delta);
}

export function willGoNegative(currentAvailable: number, delta: number): boolean {
	return currentAvailable + delta < 0;
}

export function formatDelta(delta: number): string {
	if (delta > 0) return `+${delta}`;
	if (delta < 0) return `−${Math.abs(delta)}`;
	return '0';
}
