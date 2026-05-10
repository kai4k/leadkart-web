/**
 * Boundary tests for the auth feature Zod schemas. The login /
 * refresh schemas are exercised end-to-end via the SigninForm happy
 * path; this file covers the authenticated change-password input
 * which has no e2e coverage today.
 */
import { describe, expect, it } from 'vitest';
import { changePasswordSchema } from '$lib/features/auth/schemas';

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
