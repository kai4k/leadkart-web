/**
 * Boundary tests for the Leads Zod schemas.
 *
 * Schemas mirror docs/superpowers/specs/2026-05-23-crm-modules-contracts.md.
 */
import { describe, expect, it } from 'vitest';
import {
	leadDtoSchema,
	listLeadsResponseSchema,
	createLeadSchema,
	updateLeadSchema,
	bulkLeadActionSchema,
	bulkUploadPreviewSchema,
	bulkUploadResultSchema
} from '$lib/features/leads/schemas';

const LEAD_ID = '00000000-0000-4000-8000-000000000001';
const TENANT_ID = '00000000-0000-4000-8000-0000000000aa';

function fixtureLead(over: Record<string, unknown> = {}) {
	return {
		id: LEAD_ID,
		tenant_id: TENANT_ID,
		full_name: 'Jane Doe',
		company: 'Acme',
		email: 'jane@acme.com',
		phone: '+15550100',
		source: 'website',
		stage: 'new',
		value: 5000,
		currency: 'USD',
		owner_membership_id: '00000000-0000-4000-8000-0000000000bb',
		tags: ['enterprise', 'follow-up'],
		notes: 'Asked about pricing',
		last_contacted_at: '2026-05-20T10:00:00Z',
		next_followup_at: '2026-05-30T10:00:00Z',
		created_at: '2026-05-01T10:00:00Z',
		updated_at: '2026-05-20T10:00:00Z',
		created_by_membership_id: '00000000-0000-4000-8000-0000000000cc',
		...over
	};
}

describe('leadDtoSchema', () => {
	it('parses a well-formed LeadDto', () => {
		const parsed = leadDtoSchema.parse(fixtureLead());
		expect(parsed.id).toBe(LEAD_ID);
		expect(parsed.tags).toEqual(['enterprise', 'follow-up']);
	});

	it('accepts null company/email/phone', () => {
		const parsed = leadDtoSchema.parse(
			fixtureLead({ company: null, email: null, phone: null, notes: null })
		);
		expect(parsed.company).toBeNull();
	});

	it('defaults currency when missing', () => {
		const raw = fixtureLead();
		delete (raw as { currency?: unknown }).currency;
		const parsed = leadDtoSchema.parse(raw);
		expect(parsed.currency).toBe('USD');
	});

	it('rejects an unknown stage', () => {
		expect(() => leadDtoSchema.parse(fixtureLead({ stage: 'in_orbit' }))).toThrow();
	});

	it('rejects an unknown source', () => {
		expect(() => leadDtoSchema.parse(fixtureLead({ source: 'tiktok' }))).toThrow();
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

describe('createLeadSchema', () => {
	it('requires full_name + source + stage', () => {
		expect(
			createLeadSchema.safeParse({ full_name: '', source: 'manual', stage: 'new' }).success
		).toBe(false);
		expect(
			createLeadSchema.safeParse({ full_name: 'Jane', source: 'manual', stage: 'new' }).success
		).toBe(true);
	});

	it('rejects malformed email', () => {
		const result = createLeadSchema.safeParse({
			full_name: 'Jane',
			source: 'manual',
			stage: 'new',
			email: 'not-an-email'
		});
		expect(result.success).toBe(false);
	});

	it('accepts empty email (treated as no email)', () => {
		const result = createLeadSchema.safeParse({
			full_name: 'Jane',
			source: 'manual',
			stage: 'new',
			email: ''
		});
		expect(result.success).toBe(true);
	});
});

describe('updateLeadSchema', () => {
	it('all fields are optional (PATCH semantics)', () => {
		const result = updateLeadSchema.safeParse({ stage: 'won' });
		expect(result.success).toBe(true);
	});
});

describe('bulkLeadActionSchema', () => {
	it('requires non-empty ids + valid action', () => {
		expect(bulkLeadActionSchema.safeParse({ ids: [], action: 'delete' }).success).toBe(false);
		expect(bulkLeadActionSchema.safeParse({ ids: [LEAD_ID], action: 'delete' }).success).toBe(true);
	});

	it('rejects ids over 500', () => {
		const tooMany = Array.from({ length: 501 }, () => LEAD_ID);
		expect(bulkLeadActionSchema.safeParse({ ids: tooMany, action: 'delete' }).success).toBe(false);
	});
});

describe('bulkUploadPreviewSchema', () => {
	it('parses a preview shape with no errors', () => {
		const parsed = bulkUploadPreviewSchema.parse({
			total_rows: 5,
			rows: [{ full_name: 'Jane' }],
			errors: []
		});
		expect(parsed.total_rows).toBe(5);
	});

	it('parses errors with row_number + message', () => {
		const parsed = bulkUploadPreviewSchema.parse({
			total_rows: 3,
			rows: [],
			errors: [{ row_number: 2, field: 'email', code: 'invalid', message: 'Bad email' }]
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
