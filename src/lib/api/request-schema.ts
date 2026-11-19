import { z } from 'zod';
import { ChangePasswordRequest } from '#lib/api/generated/index.ts';

/**
 * Field rules several request (form) schemas share. Response data is never format-checked
 * (`response-schema.ts`); these are the rules a user's input must meet before it is sent.
 */

/** "Why are you doing this": required, capped at 500. Suspend, delete, anonymise, deactivate, write-off. */
export const reasonField = z.string().min(1, 'Reason is required').max(500);

/** The contract's password floor (identical for change-password, create-user and register-tenant). */
const PASSWORD_MIN_LENGTH = ChangePasswordRequest.shape.new_password.minLength ?? 12;

/** A NEW password a user picks. (The current/sign-in password is only checked for presence.) */
export const newPasswordField = z
	.string()
	.min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
