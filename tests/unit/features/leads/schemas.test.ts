/**
 * Boundary tests for the CRM Leads Zod schemas.
 *
 * Schemas mirror docs/superpowers/specs/2026-05-23-crm-modules-contracts.md
 * (Module 1 — CRM Leads). The frontend's hand-rolled Zod schemas exist
 * to catch backend response-shape drift at the gateway boundary +
 * client-side validate form input.
 */
import { describe, expect, it } from 'vitest';
import {
	crmLeadDtoSchema,
	listLeadsResponseSchema,
	updateLeadSchema,
	bulkLeadActionSchema,
	bulkUploadPreviewSchema,
	bulkUploadResultSchema,
	mobileNumberSchema,
	pinCodeSchema,
	gstinSchema,
	panSchema,
	logCallSchema,
	reassignLeadSchema,
	leadStageSchema,
	leadTemperatureSchema,
	callOutcomeSchema
} from '$lib/features/leads/schemas';

const LEAD_ID = '00000000-0000-4000-8000-000000000001';
const TENANT_ID = '00000000-0000-4000-8000-0000000000aa';

function fixtureLead(over: Record<string, unknown> = {}) {
	return {
		id: LEAD_ID,
		tenant_id: TENANT_ID,
		platform_lead_id: '00000000-0000-4000-8000-0000000000cc',
		purchased_at: '2026-05-01T10:00:00Z',
		contact_name: 'Mahesh Pharma',
		mobile_number: '+919876543210',
		email: 'contact@maheshpharma.in',
		address: {
			pin_code: '400001',
			city: 'Mumbai',
			district: 'Mumbai',
			state: 'Maharashtra',
			street: 'Shop 12, Main Bazar'
		},
		has_drug_licence: true,
		has_gst: true,
		gst_number: '27AAAAA0000A1Z5',
		gst_verified: true,
		has_pan: true,
		pan_number: 'AAAAA1234A',
		business_type: 'pcd',
		medicine_system: 'allopathic',
		product_ranges: ['Antibiotics', 'Pediatric'],
		dosage_forms: ['Tablet', 'Syrup'],
		order_value_band: 'upto_25000',
		buy_timeline: 'within_15_days',
		stage: 'contacted',
		temperature: 'warm',
		last_contacted_at: '2026-05-20T10:00:00Z',
		next_followup_at: '2026-05-30T10:00:00Z',
		owner_membership_id: '00000000-0000-4000-8000-0000000000bb',
		notes: 'Asked about pricing',
		created_at: '2026-05-01T10:00:00Z',
		updated_at: '2026-05-20T10:00:00Z',
		...over
	};
}

describe('mobileNumberSchema', () => {
	it('accepts a valid +91 10-digit Indian mobile', () => {
		expect(mobileNumberSchema.safeParse('+919876543210').success).toBe(true);
	});

	it('rejects a 10-digit number without the +91 prefix', () => {
		expect(mobileNumberSchema.safeParse('9876543210').success).toBe(false);
	});

	it('rejects a shorter number with the prefix', () => {
		expect(mobileNumberSchema.safeParse('+91987').success).toBe(false);
	});

	it('rejects numbers starting outside 6-9', () => {
		// First mobile-digit must be 6, 7, 8, or 9 — a 5 leads here.
		expect(mobileNumberSchema.safeParse('+915123456789').success).toBe(false);
	});

	it('rejects mobiles with too many digits', () => {
		expect(mobileNumberSchema.safeParse('+918212345678123').success).toBe(false);
	});
});

describe('pinCodeSchema', () => {
	it('accepts a 6-digit PIN not starting with 0', () => {
		expect(pinCodeSchema.safeParse('110001').success).toBe(true);
	});

	it('rejects a PIN starting with 0', () => {
		expect(pinCodeSchema.safeParse('010001').success).toBe(false);
	});

	it('rejects 5-digit PINs', () => {
		expect(pinCodeSchema.safeParse('11000').success).toBe(false);
	});
});

describe('gstinSchema', () => {
	it('accepts a canonical 15-character GSTIN', () => {
		expect(gstinSchema.safeParse('27AAAAA0000A1Z5').success).toBe(true);
	});

	it('rejects shorter strings', () => {
		expect(gstinSchema.safeParse('27AAAAA0000A1Z').success).toBe(false);
	});

	it('rejects when the 13th char is not Z', () => {
		// Position 13 (index 12) must be literal Z.
		expect(gstinSchema.safeParse('27AAAAA0000A1A5').success).toBe(false);
	});
});

describe('panSchema', () => {
	it('accepts canonical AAAAA9999A', () => {
		expect(panSchema.safeParse('AAAAA1234A').success).toBe(true);
	});

	it('rejects lowercase PANs', () => {
		expect(panSchema.safeParse('aaaaa1234A').success).toBe(false);
	});

	it('rejects wrong-length PANs', () => {
		expect(panSchema.safeParse('AAAA1234A').success).toBe(false);
	});
});

describe('leadStageSchema', () => {
	it('accepts every BRD stage', () => {
		for (const s of ['new', 'contacted', 'interested', 'negotiation', 'converted', 'lost']) {
			expect(leadStageSchema.safeParse(s).success).toBe(true);
		}
	});

	it('rejects legacy stages (qualified, proposal, won)', () => {
		expect(leadStageSchema.safeParse('qualified').success).toBe(false);
		expect(leadStageSchema.safeParse('proposal').success).toBe(false);
		expect(leadStageSchema.safeParse('won').success).toBe(false);
	});
});

describe('leadTemperatureSchema', () => {
	it('accepts every BRD temperature', () => {
		for (const t of ['hot', 'warm', 'cold', 'dead']) {
			expect(leadTemperatureSchema.safeParse(t).success).toBe(true);
		}
	});

	it('rejects unknown temperatures', () => {
		expect(leadTemperatureSchema.safeParse('lukewarm').success).toBe(false);
	});
});

describe('callOutcomeSchema', () => {
	it('accepts canonical outcomes', () => {
		for (const o of [
			'connected',
			'busy',
			'no_answer',
			'switched_off',
			'wrong_number',
			'do_not_call'
		]) {
			expect(callOutcomeSchema.safeParse(o).success).toBe(true);
		}
	});
});

describe('crmLeadDtoSchema', () => {
	it('parses a well-formed CrmLeadDto', () => {
		const parsed = crmLeadDtoSchema.parse(fixtureLead());
		expect(parsed.id).toBe(LEAD_ID);
		expect(parsed.address.pin_code).toBe('400001');
	});

	it('accepts null email + nullable compliance fields', () => {
		const parsed = crmLeadDtoSchema.parse(
			fixtureLead({ email: null, gst_number: null, pan_number: null, notes: null })
		);
		expect(parsed.email).toBeNull();
	});

	it('rejects an unknown stage', () => {
		expect(() => crmLeadDtoSchema.parse(fixtureLead({ stage: 'in_orbit' }))).toThrow();
	});

	it('rejects a malformed mobile number', () => {
		expect(() => crmLeadDtoSchema.parse(fixtureLead({ mobile_number: '0123' }))).toThrow();
	});

	it('rejects a malformed PIN', () => {
		expect(() =>
			crmLeadDtoSchema.parse(
				fixtureLead({
					address: {
						pin_code: '00001',
						city: 'X',
						district: 'X',
						state: 'X'
					}
				})
			)
		).toThrow();
	});
});

describe('listLeadsResponseSchema', () => {
	it('parses items + has_more', () => {
		const parsed = listLeadsResponseSchema.parse({
			items: [fixtureLead()],
			has_more: false
		});
		expect(parsed.items).toHaveLength(1);
		expect(parsed.has_more).toBe(false);
	});

	it('accepts next_cursor + total_count', () => {
		const parsed = listLeadsResponseSchema.parse({
			items: [],
			has_more: true,
			next_cursor: 'opaque',
			total_count: 142
		});
		expect(parsed.next_cursor).toBe('opaque');
		expect(parsed.total_count).toBe(142);
	});
});

describe('updateLeadSchema', () => {
	it('all fields are optional (PATCH semantics)', () => {
		expect(updateLeadSchema.safeParse({ stage: 'contacted' }).success).toBe(true);
		expect(updateLeadSchema.safeParse({}).success).toBe(true);
	});

	it('rejects an invalid GSTIN in the patch body', () => {
		expect(updateLeadSchema.safeParse({ gst_number: 'NOT-A-GSTIN' }).success).toBe(false);
	});
});

describe('reassignLeadSchema', () => {
	it('requires to_membership_id', () => {
		expect(reassignLeadSchema.safeParse({}).success).toBe(false);
		expect(
			reassignLeadSchema.safeParse({
				to_membership_id: '00000000-0000-4000-8000-0000000000bb'
			}).success
		).toBe(true);
	});
});

describe('logCallSchema', () => {
	it('requires outcome', () => {
		expect(logCallSchema.safeParse({ outcome: 'connected' }).success).toBe(true);
		expect(logCallSchema.safeParse({}).success).toBe(false);
	});

	it('rejects too-small callback_window_minutes', () => {
		expect(
			logCallSchema.safeParse({ outcome: 'connected', callback_window_minutes: 1 }).success
		).toBe(false);
	});
});

describe('bulkLeadActionSchema', () => {
	it('requires non-empty ids + a valid action', () => {
		expect(bulkLeadActionSchema.safeParse({ ids: [], action: 'change_stage' }).success).toBe(false);
		expect(
			bulkLeadActionSchema.safeParse({ ids: [LEAD_ID], action: 'change_stage', stage: 'contacted' })
				.success
		).toBe(true);
	});

	it('rejects ids over 500', () => {
		const tooMany = Array.from({ length: 501 }, () => LEAD_ID);
		expect(bulkLeadActionSchema.safeParse({ ids: tooMany, action: 'change_stage' }).success).toBe(
			false
		);
	});
});

describe('bulkUploadPreviewSchema', () => {
	it('parses a preview shape with no errors', () => {
		const parsed = bulkUploadPreviewSchema.parse({
			total_rows: 5,
			rows: [{ contact_name: 'Acme' }],
			errors: []
		});
		expect(parsed.total_rows).toBe(5);
	});

	it('parses errors with row_number + message', () => {
		const parsed = bulkUploadPreviewSchema.parse({
			total_rows: 3,
			rows: [],
			errors: [{ row_number: 2, field: 'mobile_number', code: 'invalid', message: 'Bad mobile' }]
		});
		expect(parsed.errors[0].row_number).toBe(2);
	});
});

describe('bulkUploadResultSchema', () => {
	it('parses counts + empty errors', () => {
		const parsed = bulkUploadResultSchema.parse({
			inserted: 100,
			updated: 5,
			failed: 0,
			errors: []
		});
		expect(parsed.inserted).toBe(100);
	});
});
