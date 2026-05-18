import type { PersonDto } from './types';

export type LifecycleVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Returns the display name for a Person: "First Last", or falls back
 *  to a single name part, or the email when both names are blank. */
export function personDisplayName(p: PersonDto): string {
	const first = p.first_name.trim();
	const last = p.last_name.trim();
	if (first && last) return `${first} ${last}`;
	if (first) return first;
	if (last) return last;
	return p.email;
}

/** Returns the lifecycle badge label + variant for a Person.
 *
 *  Priority (most-severe state wins):
 *  1. anonymised  → neutral  (data is gone; no further action possible)
 *  2. globally suspended → danger
 *  3. inactive    → warning
 *  4. active      → success
 */
export function personLifecycleBadge(p: PersonDto): {
	label: string;
	variant: LifecycleVariant;
} {
	if (p.is_anonymised) return { label: 'Anonymised', variant: 'neutral' };
	if (p.is_globally_suspended) return { label: 'Globally suspended', variant: 'danger' };
	if (!p.is_active) return { label: 'Inactive', variant: 'warning' };
	return { label: 'Active', variant: 'success' };
}

/** True when the operator can globally suspend this Person.
 *  Not allowed when already suspended or already anonymised. */
export function canGloballySuspend(p: PersonDto): boolean {
	return !p.is_anonymised && !p.is_globally_suspended;
}

/** True when the operator can lift the global suspension.
 *  Requires an active suspension and a non-anonymised record. */
export function canLiftSuspension(p: PersonDto): boolean {
	return p.is_globally_suspended && !p.is_anonymised;
}

/** True when the operator can anonymise this Person.
 *  The anonymise action is irreversible; blocked once already done. */
export function canAnonymise(p: PersonDto): boolean {
	return !p.is_anonymised;
}
