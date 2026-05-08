/**
 * Boundary tests for the auth feature Zod schemas covering the
 * password-recovery + email-change additions. Existing login /
 * refresh schemas were validated by the auth e2e + the SigninForm
 * happy path; these new schemas govern flows that need their own
 * coverage before forms ship in subsequent commits.
 */
import { describe, expect, it } from 'vitest';
import {
	changePasswordSchema,
	confirmEmailChangeSchema,
	requestEmailChangeSchema,
	requestPasswordResetSchema,
	resetPasswordSchema
} from '$lib/features/auth/schemas';

describe('requestPasswordResetSchema', () => {
	it('accepts a well-formed email', () => {
		expect(requestPasswordResetSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
	});

	it('rejects empty email and malformed strings', () => {
		expect(requestPasswordResetSchema.safeParse({ email: '' }).success).toBe(false);
		expect(requestPasswordResetSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
	});
});

describe('resetPasswordSchema', () => {
	it('accepts token + 8+ char password', () => {
		expect(
			resetPasswordSchema.safeParse({ token: 'abc.def.ghi', new_password: 'Hunter2!!' }).success
		).toBe(true);
	});

	it('rejects empty token or sub-8-char password', () => {
		expect(resetPasswordSchema.safeParse({ token: '', new_password: 'Hunter2!!' }).success).toBe(
			false
		);
		expect(resetPasswordSchema.safeParse({ token: 'abc', new_password: 'short' }).success).toBe(
			false
		);
	});
});

describe('changePasswordSchema', () => {
	it('accepts non-empty current + 8+ char new', () => {
		expect(
			changePasswordSchema.safeParse({
				current_password: 'whatever',
				new_password: 'Stronger1!'
			}).success
		).toBe(true);
	});

	it('rejects blank current or sub-8 new', () => {
		expect(
			changePasswordSchema.safeParse({ current_password: '', new_password: 'Stronger1!' }).success
		).toBe(false);
		expect(
			changePasswordSchema.safeParse({ current_password: 'old', new_password: 'short' }).success
		).toBe(false);
	});
});

describe('requestEmailChangeSchema', () => {
	it('accepts a valid new_email', () => {
		expect(requestEmailChangeSchema.safeParse({ new_email: 'new@acme.test' }).success).toBe(true);
	});

	it('rejects empty / malformed', () => {
		expect(requestEmailChangeSchema.safeParse({ new_email: '' }).success).toBe(false);
		expect(requestEmailChangeSchema.safeParse({ new_email: 'no-at-sign' }).success).toBe(false);
	});
});

describe('confirmEmailChangeSchema', () => {
	it('accepts non-empty token', () => {
		expect(confirmEmailChangeSchema.safeParse({ token: 'abc.def' }).success).toBe(true);
	});

	it('rejects empty token', () => {
		expect(confirmEmailChangeSchema.safeParse({ token: '' }).success).toBe(false);
	});
});
