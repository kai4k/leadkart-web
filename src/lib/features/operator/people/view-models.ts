import type { PersonDto } from './types';
import { displayName } from '#lib/utils/person-name.ts';
import { defineStatusMap } from '#lib/utils/status.ts';

/** Display name for a Person; falls back to the full email when both names are blank. */
export function personDisplayName(p: PersonDto): string {
	return displayName(p, { emailFallback: 'full' });
}

export type PersonLifecycle = 'suspended' | 'inactive' | 'active';

/** A Person's lifecycle state. Priority (most severe wins): globally suspended, inactive, active. */
export function personLifecycleKey(p: PersonDto): PersonLifecycle {
	if (p.is_globally_suspended) return 'suspended';
	if (!p.is_active) return 'inactive';
	return 'active';
}

export const personLifecycle = defineStatusMap<PersonLifecycle>({
	suspended: { label: 'Globally suspended', variant: 'danger' },
	inactive: { label: 'Inactive', variant: 'warning' },
	active: { label: 'Active', variant: 'success' }
});

/** True when the operator can globally suspend this Person.
 *  Not allowed when already suspended. */
export function canGloballySuspend(p: PersonDto): boolean {
	return !p.is_globally_suspended;
}

/** True when the operator can lift the global suspension.
 *  Requires an active suspension. */
export function canLiftSuspension(p: PersonDto): boolean {
	return p.is_globally_suspended;
}
