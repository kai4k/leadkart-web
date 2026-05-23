/**
 * Pure view-model tests for the CRM Leads feature.
 */
import { describe, expect, it } from 'vitest';
import {
	STAGE_META,
	STAGE_OPTIONS,
	TEMPERATURE_META,
	TEMPERATURE_OPTIONS,
	stageMeta,
	temperatureMeta,
	BUSINESS_TYPE_LABEL,
	MEDICINE_SYSTEM_LABEL,
	ORDER_VALUE_BAND_LABEL,
	BUY_TIMELINE_LABEL,
	CALL_OUTCOME_LABEL,
	REMINDER_KIND_LABEL,
	REMINDER_STATUS_LABEL,
	locationLabel,
	isStale,
	relativeTime,
	groupByStage
} from '$lib/features/leads/view-models';
import type { CrmLeadDto } from '$lib/features/leads/schemas';

const LEAD_ID = '00000000-0000-4000-8000-000000000001';
const TENANT_ID = '00000000-0000-4000-8000-0000000000aa';

function makeLead(over: Partial<CrmLeadDto> = {}): CrmLeadDto {
	return {
		id: LEAD_ID,
		tenant_id: TENANT_ID,
		platform_lead_id: '00000000-0000-4000-8000-0000000000cc',
		purchased_at: '2026-05-01T10:00:00Z',
		contact_name: 'Mahesh Pharma',
		mobile_number: '+919876543210',
		address: { pin_code: '400001', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra' },
		has_drug_licence: true,
		has_gst: true,
		gst_verified: true,
		has_pan: true,
		business_type: 'pcd',
		medicine_system: 'allopathic',
		product_ranges: [],
		dosage_forms: [],
		order_value_band: 'below_5000',
		buy_timeline: 'within_month',
		stage: 'new',
		temperature: 'warm',
		owner_membership_id: '00000000-0000-4000-8000-0000000000bb',
		created_at: '2026-05-01T10:00:00Z',
		updated_at: '2026-05-01T10:00:00Z',
		...over
	} as CrmLeadDto;
}

describe('stage / temperature meta', () => {
	it('stageMeta maps every value', () => {
		for (const m of STAGE_META) {
			expect(stageMeta(m.value).label).toBe(m.label);
			expect(stageMeta(m.value).variant).toBeTruthy();
		}
	});

	it('temperatureMeta maps every value', () => {
		for (const m of TEMPERATURE_META) {
			expect(temperatureMeta(m.value).label).toBe(m.label);
		}
	});

	it('STAGE_OPTIONS covers all 6 BRD stages in order', () => {
		expect(STAGE_OPTIONS.map((o) => o.value)).toEqual([
			'new',
			'contacted',
			'interested',
			'negotiation',
			'converted',
			'lost'
		]);
	});

	it('TEMPERATURE_OPTIONS covers all 4 BRD temperatures', () => {
		expect(TEMPERATURE_OPTIONS.map((o) => o.value)).toEqual(['hot', 'warm', 'cold', 'dead']);
	});

	it('converted is a success variant', () => {
		expect(stageMeta('converted').variant).toBe('success');
	});

	it('lost is a danger variant', () => {
		expect(stageMeta('lost').variant).toBe('danger');
	});
});

describe('enum labels', () => {
	it('business types are covered', () => {
		expect(BUSINESS_TYPE_LABEL.pcd).toBe('PCD');
		expect(BUSINESS_TYPE_LABEL.third_party).toBe('Third-party');
	});

	it('medicine systems are covered', () => {
		expect(MEDICINE_SYSTEM_LABEL.allopathic).toBe('Allopathic');
		expect(MEDICINE_SYSTEM_LABEL.ayurvedic).toBe('Ayurvedic');
	});

	it('order value bands all map', () => {
		expect(ORDER_VALUE_BAND_LABEL.below_5000).toContain('5,000');
		expect(ORDER_VALUE_BAND_LABEL.above_50000).toContain('50,000');
	});

	it('buy timelines all map', () => {
		expect(BUY_TIMELINE_LABEL.within_week).toContain('week');
		expect(BUY_TIMELINE_LABEL.within_month).toContain('month');
	});

	it('call outcomes all map', () => {
		expect(CALL_OUTCOME_LABEL.connected).toBe('Connected');
		expect(CALL_OUTCOME_LABEL.do_not_call).toBe('Do not call');
	});

	it('reminder kinds + statuses map', () => {
		expect(REMINDER_KIND_LABEL.callback).toBe('Callback');
		expect(REMINDER_STATUS_LABEL.pending).toBe('Pending');
	});
});

describe('locationLabel', () => {
	it('uses City, State · PIN when complete', () => {
		const lead = makeLead();
		expect(locationLabel(lead)).toBe('Mumbai, Maharashtra · 400001');
	});

	it('falls back to PIN when city + state are blank', () => {
		const lead = makeLead({
			address: { pin_code: '110001', city: '', district: '', state: '' }
		});
		expect(locationLabel(lead)).toBe('110001');
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

	it('returns false when stage is converted/lost regardless of contact age', () => {
		const lead = makeLead({
			stage: 'converted',
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

describe('groupByStage', () => {
	it('returns 6 columns in BRD order', () => {
		const cols = groupByStage([]);
		expect(cols.map((c) => c.id)).toEqual([
			'new',
			'contacted',
			'interested',
			'negotiation',
			'converted',
			'lost'
		]);
	});

	it('counts per stage', () => {
		const leads = [
			makeLead({ id: 'a', stage: 'new' }),
			makeLead({ id: 'b', stage: 'new' }),
			makeLead({ id: 'c', stage: 'converted' })
		];
		const cols = groupByStage(leads);
		expect(cols.find((c) => c.id === 'new')?.count).toBe(2);
		expect(cols.find((c) => c.id === 'converted')?.count).toBe(1);
		expect(cols.find((c) => c.id === 'lost')?.count).toBe(0);
	});
});
