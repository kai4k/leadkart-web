/**
 * Unit tests for operator/people view-models.
 *
 * All functions are pure (no async, no side effects) so tests run
 * without a browser environment or store setup.
 */
import { describe, expect, it } from 'vitest';
import {
	personDisplayName,
	personLifecycleBadge,
	canGloballySuspend,
	canLiftSuspension,
	canAnonymise
} from '$lib/features/operator/people/view-models';
import type { PersonDto } from '$lib/features/operator/people/types';

// ---------------------------------------------------------------------------
// Fixture factory — only fields consumed by view-models needed
// ---------------------------------------------------------------------------

function makePerson(overrides: Partial<PersonDto> = {}): PersonDto {
	return {
		id: 'pid-001',
		email: 'raj@acme.test',
		first_name: 'Raj',
		last_name: 'Verma',
		is_active: true,
		is_anonymised: false,
		is_globally_suspended: false,
		global_suspension_reason: '',
		globally_suspended_at: '',
		created_at: '2026-01-01T00:00:00Z',
		anonymised_at: '',
		...overrides
	};
}

// ---------------------------------------------------------------------------
// personDisplayName
// ---------------------------------------------------------------------------

describe('personDisplayName', () => {
	it('returns "First Last" when both names are present', () => {
		expect(personDisplayName(makePerson({ first_name: 'Raj', last_name: 'Verma' }))).toBe(
			'Raj Verma'
		);
	});

	it('returns first name only when last_name is blank', () => {
		expect(personDisplayName(makePerson({ first_name: 'Raj', last_name: '  ' }))).toBe('Raj');
	});

	it('returns last name only when first_name is blank', () => {
		expect(personDisplayName(makePerson({ first_name: '', last_name: 'Verma' }))).toBe('Verma');
	});

	it('falls back to email when both names are blank', () => {
		expect(
			personDisplayName(makePerson({ first_name: '  ', last_name: '  ', email: 'raj@acme.test' }))
		).toBe('raj@acme.test');
	});

	it('trims surrounding whitespace from names before deciding', () => {
		expect(personDisplayName(makePerson({ first_name: ' Raj ', last_name: ' Verma ' }))).toBe(
			'Raj Verma'
		);
	});
});

// ---------------------------------------------------------------------------
// personLifecycleBadge
// ---------------------------------------------------------------------------

describe('personLifecycleBadge', () => {
	it('active person → success + "Active"', () => {
		const badge = personLifecycleBadge(makePerson({ is_active: true }));
		expect(badge.variant).toBe('success');
		expect(badge.label).toBe('Active');
	});

	it('inactive (not anonymised, not suspended) → warning + "Inactive"', () => {
		const badge = personLifecycleBadge(makePerson({ is_active: false }));
		expect(badge.variant).toBe('warning');
		expect(badge.label).toBe('Inactive');
	});

	it('globally suspended → danger + "Globally suspended"', () => {
		const badge = personLifecycleBadge(makePerson({ is_globally_suspended: true }));
		expect(badge.variant).toBe('danger');
		expect(badge.label).toBe('Globally suspended');
	});

	it('anonymised → neutral + "Anonymised" (highest priority)', () => {
		const badge = personLifecycleBadge(
			makePerson({ is_anonymised: true, is_globally_suspended: true, is_active: false })
		);
		expect(badge.variant).toBe('neutral');
		expect(badge.label).toBe('Anonymised');
	});

	it('anonymised takes priority over suspended', () => {
		const badge = personLifecycleBadge(
			makePerson({ is_anonymised: true, is_globally_suspended: true })
		);
		expect(badge.label).toBe('Anonymised');
	});
});

// ---------------------------------------------------------------------------
// canGloballySuspend
// ---------------------------------------------------------------------------

describe('canGloballySuspend', () => {
	it('true for an active, non-anonymised person', () => {
		expect(canGloballySuspend(makePerson())).toBe(true);
	});

	it('false when already globally suspended', () => {
		expect(canGloballySuspend(makePerson({ is_globally_suspended: true }))).toBe(false);
	});

	it('false when anonymised', () => {
		expect(canGloballySuspend(makePerson({ is_anonymised: true }))).toBe(false);
	});

	it('false when both anonymised and suspended', () => {
		expect(
			canGloballySuspend(makePerson({ is_anonymised: true, is_globally_suspended: true }))
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canLiftSuspension
// ---------------------------------------------------------------------------

describe('canLiftSuspension', () => {
	it('true when globally suspended and not anonymised', () => {
		expect(canLiftSuspension(makePerson({ is_globally_suspended: true }))).toBe(true);
	});

	it('false when not suspended', () => {
		expect(canLiftSuspension(makePerson({ is_globally_suspended: false }))).toBe(false);
	});

	it('false when suspended but also anonymised', () => {
		expect(
			canLiftSuspension(makePerson({ is_globally_suspended: true, is_anonymised: true }))
		).toBe(false);
	});

	it('false for a plain active person', () => {
		expect(canLiftSuspension(makePerson())).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canAnonymise
// ---------------------------------------------------------------------------

describe('canAnonymise', () => {
	it('true for an active person who has never been anonymised', () => {
		expect(canAnonymise(makePerson())).toBe(true);
	});

	it('true even for a suspended person (anonymise is irreversible, not blocked by suspension)', () => {
		expect(canAnonymise(makePerson({ is_globally_suspended: true }))).toBe(true);
	});

	it('false when already anonymised', () => {
		expect(canAnonymise(makePerson({ is_anonymised: true }))).toBe(false);
	});
});
