import { describe, expect, it } from 'vitest';
import {
	createPermissionRequestSchema,
	PERMISSION_REQUEST_MAX_DAYS
} from '#lib/features/permission-requests/schemas.ts';

describe('permission request duration bound (derived from the generated contract)', () => {
	const req = (duration_days: number) => ({
		permission: 'identity.users.create',
		duration_days,
		reason: 'Need it for the audit week'
	});
	it('is the contract max (90 days)', () => {
		expect(PERMISSION_REQUEST_MAX_DAYS).toBe(90);
	});
	it('accepts the max and rejects one above it', () => {
		expect(createPermissionRequestSchema.safeParse(req(PERMISSION_REQUEST_MAX_DAYS)).success).toBe(
			true
		);
		expect(
			createPermissionRequestSchema.safeParse(req(PERMISSION_REQUEST_MAX_DAYS + 1)).success
		).toBe(false);
	});
});
