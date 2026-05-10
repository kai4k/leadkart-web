/**
 * Tenant view-models — pure functions transforming `Tenant` DTOs into
 * render-ready shapes. The ViewModel layer of the Gateway → Service →
 * ViewModel → Component flow.
 *
 * Strict purity: NO async, NO side effects, NO DOM, NO i18n calls.
 * Components own localization via $_('tenant.status.active') etc;
 * view-models return raw English labels + structural Badge variants
 * components map to their own primitive APIs.
 *
 * Why this layer exists: keeps display normalisation (formatting a
 * pincode, deciding which Badge variant a status maps to, computing
 * the title from display_name||legal_name) OUT of components — so the
 * same logic re-used across Settings page header + Topbar tenant chip
 * + future Tenant List rows stays consistent without duplication.
 */

import type { AdminAddress, Tenant } from './types';

/**
 * Page-header / topbar title for a tenant. Prefers the friendly
 * display_name; falls back to legal_name when display is empty.
 * legal_name is always non-empty on the server side, so the fallback
 * is guaranteed to produce a value.
 */
export function tenantDisplayName(tenant: Tenant): string {
	const display = tenant.display_name?.trim();
	return display && display.length > 0 ? display : tenant.legal_name;
}

export type TenantStatusVariant = 'success' | 'warning' | 'danger' | 'info';

export interface TenantStatusBadge {
	/** Raw English label — components may translate via i18n key. */
	label: string;
	/** Badge / Alert variant the component will pass to its primitive. */
	variant: TenantStatusVariant;
}

/**
 * Maps a tenant status string to its display label + Badge variant.
 * Status values mirror the leadkart-go domain enum
 * (`internal/identity/domain/tenant/status.go`); unknown values fall
 * through to a neutral 'info' variant rather than throwing — the UI
 * stays renderable while the unknown label surfaces the upstream
 * vocabulary drift to whoever's looking.
 */
export function tenantStatusBadge(status: string): TenantStatusBadge {
	switch (status) {
		case 'active':
			return { label: 'Active', variant: 'success' };
		case 'pending':
			return { label: 'Pending', variant: 'info' };
		case 'suspended':
			return { label: 'Suspended', variant: 'warning' };
		case 'pending_deletion':
			return { label: 'Scheduled for deletion', variant: 'danger' };
		default:
			return { label: status, variant: 'info' };
	}
}

/**
 * Formats an Indian phone number as `+91 99999 00000` for read-only
 * summary display. Forms keep the raw bind:value — formatting is
 * display-only.
 *
 * Inputs the form may produce:
 *   "+919999900000"  → "+91 99999 00000"
 *   "9999900000"     → "+91 99999 00000"
 *   "+91 99999 00000" → "+91 99999 00000"  (already-formatted is idempotent)
 *   ""               → ""
 *   "+1 555-1234"    → "+1 555-1234" (preserve as-is for non-IN numbers)
 */
export function formattedPhone(phone: string | undefined): string {
	const trimmed = phone?.trim() ?? '';
	if (trimmed.length === 0) return '';
	const digitsOnly = trimmed.replace(/\D/g, '');
	const isIndian =
		(trimmed.startsWith('+91') && digitsOnly.length === 12) ||
		(!trimmed.startsWith('+') && digitsOnly.length === 10);
	if (!isIndian) return trimmed;
	const tail = digitsOnly.slice(-10);
	return `+91 ${tail.slice(0, 5)} ${tail.slice(5)}`;
}

/**
 * Formats a 6-digit Indian pincode as "400 076". Non-6-digit inputs
 * pass through verbatim — international addresses (when LeadKart
 * expands beyond IN) keep their native format.
 */
export function formattedPincode(pincode: string | undefined): string {
	const value = pincode?.trim() ?? '';
	if (!/^\d{6}$/.test(value)) return value;
	return `${value.slice(0, 3)} ${value.slice(3)}`;
}

/**
 * Compresses an `AdminAddress` into the lines a postal-style summary
 * card would render. Empty fields are dropped (no blank lines), so
 * tenants who haven't onboarded their full address still get a clean
 * compact display rather than a column of em-dashes.
 *
 * Line shape (skipping any line whose pieces are all empty):
 *   1. street
 *   2. city, district
 *   3. state — pincode
 */
export function formattedAddressLines(address: AdminAddress | undefined): string[] {
	if (!address) return [];
	const lines: string[] = [];
	const street = address.street?.trim();
	if (street) lines.push(street);

	const cityDistrict = [address.city?.trim(), address.district?.trim()].filter(
		(s): s is string => !!s && s.length > 0
	);
	if (cityDistrict.length > 0) lines.push(cityDistrict.join(', '));

	const pinned = formattedPincode(address.pincode);
	const stateAndPin = [address.state?.trim(), pinned].filter(
		(s): s is string => !!s && s.length > 0
	);
	if (stateAndPin.length > 0) lines.push(stateAndPin.join(' — '));

	return lines;
}
