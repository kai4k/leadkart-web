/** One 
easonField behind every "reason for this action" request, whatever the feature. */
import { describe, expect, it } from 'vitest';
import { reasonField } from '#lib/api/request-schema.ts';
import {
	anonymisePersonRequestSchema,
	globalSuspendRequestSchema
} from '#lib/features/operator/people/schemas.ts';
import {
	markForDeletionRequestSchema,
	suspendTenantRequestSchema
} from '#lib/features/operator/tenants/schemas.ts';
import { deactivateUserRequestSchema } from '#lib/features/users/schemas.ts';
import { writeOffBatchRequestSchema } from '#lib/features/inventory/schemas.ts';

describe('reasonField', () => {
	it('is required (with copy) and capped at 500', () => {
		const empty = reasonField.safeParse('');
		expect(empty.success).toBe(false);
		expect(empty.error?.issues[0]?.message).toBe('form.errors.reasonRequired');
		expect(reasonField.safeParse('a'.repeat(500)).success).toBe(true);
		expect(reasonField.safeParse('a'.repeat(501)).success).toBe(false);
	});
});

describe.each([
	['suspend tenant', suspendTenantRequestSchema],
	['mark tenant for deletion', markForDeletionRequestSchema],
	['global suspend person', globalSuspendRequestSchema],
	['anonymise person', anonymisePersonRequestSchema],
	['deactivate user', deactivateUserRequestSchema],
	['write off batch', writeOffBatchRequestSchema]
])('%s request', (_name, schema) => {
	it('takes exactly the shared reason rule and nothing else', () => {
		expect(schema.safeParse({ reason: 'Policy violation' }).success).toBe(true);
		const empty = schema.safeParse({ reason: '' });
		expect(empty.error?.issues[0]?.message).toBe('form.errors.reasonRequired');
		expect(schema.safeParse({ reason: 'a'.repeat(501) }).success).toBe(false);
		expect(schema.safeParse({ reason: 'x', extra: 1 }).success).toBe(false);
	});
});
