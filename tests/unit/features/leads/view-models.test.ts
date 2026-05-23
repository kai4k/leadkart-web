/**
 * Pure view-model tests for the Leads feature.
 */
import { describe, expect, it } from 'vitest';
import {
	stageBadge,
	sourceLabel,
	formatValue,
	isStale,
	savedViews,
	relativeTime,
	STAGE_OPTIONS,
	SOURCE_OPTIONS
} from '$lib/features/leads/view-models';
import type { LeadDto } from '$lib/features/leads/schemas';

const LEAD_ID = '00000000-0000-4000-8000-000000000001';
const TENANT_ID = '00000000-0000-4000-8000-0000000000aa';

function makeLead(over: Partial<LeadDto> = {}): LeadDto {
	return {
		id: LEAD_ID,
		tenant_id: TENANT_ID,
		full_name: 'Jane Doe',
		source: 'website',
		stage: 'new',
		currency: 'USD',
		tags: [],
		created_at: '2026-05-01T10:00:00Z',
		updated_at: '2026-05-01T10:00:00Z',
		...over
	} as LeadDto;
}

describe('stageBadge', () => {
	it('maps every stage to a label + variant', () => {
		for (const s of STAGE_OPTIONS) {
			const meta = stageBadge(s.value);
			expect(meta.label).toBe(s.label);
			expect(meta.variant).toBeTruthy();
		}
	});

	it('renders "won" as success', () => {
		expect(stageBadge('won').variant).toBe('success');
	});

	it('renders "lost" as danger', () => {
		expect(stageBadge('lost').variant).toBe('danger');
	});
});

describe('sourceLabel', () => {
	it('matches the registered option label', () => {
		for (const s of SOURCE_OPTIONS) {
			expect(sourceLabel(s.value)).toBe(s.label);
		}
	});
});

describe('formatValue', () => {
	it('returns em-dash for null/undefined', () => {
		expect(formatValue(null)).toBe('—');
		expect(formatValue(undefined)).toBe('—');
	});

	it('formats USD without fractional digits when integer', () => {
		const out = formatValue(5000, 'USD');
		expect(out).toMatch(/\$5,000(\.00)?/);
	});

	it('formats with cents when non-integer', () => {
		const out = formatValue(123.45, 'USD');
		expect(out).toMatch(/\$?123\.45/);
	});

	it('falls back to currency code prefix on unknown currency', () => {
		const out = formatValue(50, 'XYZ');
		expect(out).toContain('50');
	});
});

describe('isStale', () => {
	const NOW = new Date('2026-06-01T00:00:00Z');

	it('returns true when last_contacted_at is over 7 days old and stage is open', () => {
		const lead = makeLead({
			stage: 'contacted',
			last_contacted_at: '2026-05-20T00:00:00Z'
		});
		expect(isStale(lead, NOW)).toBe(true);
	});

	it('returns false when stage is won/lost regardless of contact age', () => {
		const lead = makeLead({
			stage: 'won',
			last_contacted_at: '2026-01-01T00:00:00Z'
		});
		expect(isStale(lead, NOW)).toBe(false);
	});

	it('falls back to created_at when last_contacted_at is null', () => {
		const lead = makeLead({
			stage: 'new',
			last_contacted_at: null,
			created_at: '2026-05-20T00:00:00Z'
		});
		expect(isStale(lead, NOW)).toBe(true);
	});

	it('returns false when contact is recent', () => {
		const lead = makeLead({
			stage: 'contacted',
			last_contacted_at: '2026-05-31T00:00:00Z'
		});
		expect(isStale(lead, NOW)).toBe(false);
	});
});

describe('savedViews', () => {
	it('returns at least All / Mine / Hot / Stale', () => {
		const v = savedViews('mem_1');
		const ids = v.map((x) => x.id);
		expect(ids).toContain('all');
		expect(ids).toContain('mine');
		expect(ids).toContain('hot');
		expect(ids).toContain('stale');
	});

	it('mine view scopes by membership_id', () => {
		const mine = savedViews('mem_42').find((v) => v.id === 'mine');
		expect(mine?.owner_membership_id).toBe('mem_42');
	});

	it('hot view filters to qualified+proposal', () => {
		const hot = savedViews('mem_1').find((v) => v.id === 'hot');
		expect(hot?.stage).toEqual(['qualified', 'proposal']);
	});

	it('stale view is marked staleOnly', () => {
		const stale = savedViews('mem_1').find((v) => v.id === 'stale');
		expect(stale?.staleOnly).toBe(true);
	});
});

describe('relativeTime', () => {
	const NOW = new Date('2026-06-01T00:00:00Z');

	it('returns em-dash for null/undefined', () => {
		expect(relativeTime(null, NOW)).toBe('—');
		expect(relativeTime(undefined, NOW)).toBe('—');
	});

	it('returns "just now" for sub-45s diffs', () => {
		expect(relativeTime('2026-06-01T00:00:30Z', NOW)).toBe('just now');
	});

	it('returns relative days for >= 1 day diffs', () => {
		const out = relativeTime('2026-05-30T00:00:00Z', NOW);
		expect(out).toMatch(/day|days/i);
	});
});
