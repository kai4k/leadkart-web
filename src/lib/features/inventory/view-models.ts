/**
 * Pure view-model helpers for the inventory module.
 * No async, no side effects, no DOM access — every function takes
 * a DTO + returns render-ready data.
 */
import type { InventoryItemDto, AdjustmentReason } from './schemas';

export type StockLevel = 'in' | 'low' | 'out';

export interface StockLevelBadgeVm {
	level: StockLevel;
	label: string;
	variant: 'success' | 'warning' | 'danger';
}

/**
 * Three-state classification used by the StockLevelBadge.
 *   out → current_stock === 0
 *   low → current_stock > 0 && current_stock <= reorder_point
 *   in  → otherwise
 */
export function stockLevel(
	item: Pick<InventoryItemDto, 'current_stock' | 'reorder_point'>
): StockLevel {
	if (item.current_stock <= 0) return 'out';
	if (item.current_stock <= item.reorder_point) return 'low';
	return 'in';
}

export function stockLevelBadge(
	item: Pick<InventoryItemDto, 'current_stock' | 'reorder_point'>
): StockLevelBadgeVm {
	const level = stockLevel(item);
	switch (level) {
		case 'out':
			return { level, label: 'Out', variant: 'danger' };
		case 'low':
			return { level, label: 'Low', variant: 'warning' };
		case 'in':
			return { level, label: 'In stock', variant: 'success' };
	}
}

const ACTIVE_LABEL: Record<
	'active' | 'inactive',
	{ label: string; variant: 'success' | 'neutral' }
> = {
	active: { label: 'Active', variant: 'success' },
	inactive: { label: 'Inactive', variant: 'neutral' }
};

export function activeBadge(item: Pick<InventoryItemDto, 'is_active'>) {
	return ACTIVE_LABEL[item.is_active ? 'active' : 'inactive'];
}

/**
 * Format price using Intl.NumberFormat. Fallback to raw string if the
 * currency code isn't valid (Intl throws on a bad code; we don't want
 * the whole row to fall over for one bad cell).
 */
export function formatPrice(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency,
			maximumFractionDigits: 2
		}).format(amount);
	} catch {
		return `${currency} ${amount.toFixed(2)}`;
	}
}

/**
 * Preview the resulting stock after a proposed delta, clamped at 0.
 * Used by the Adjust Stock dialog's "New stock will be:" line.
 */
export function previewNewStock(currentStock: number, delta: number): number {
	return Math.max(0, currentStock + delta);
}

/** Is the proposed delta going to drive stock negative? */
export function willGoNegative(currentStock: number, delta: number): boolean {
	return currentStock + delta < 0;
}

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
	purchase: 'Purchase',
	sale: 'Sale',
	return: 'Return',
	damage: 'Damage',
	correction: 'Correction',
	transfer: 'Transfer',
	other: 'Other'
};

export function adjustmentReasonLabel(reason: AdjustmentReason): string {
	return ADJUSTMENT_REASON_LABELS[reason] ?? reason;
}

/** Format an integer delta with a leading sign (e.g. +10, −5). */
export function formatDelta(delta: number): string {
	if (delta > 0) return `+${delta}`;
	// Use the figure-dash for negative — looks cleaner than "-" in toasts.
	if (delta < 0) return `−${Math.abs(delta)}`;
	return '0';
}
