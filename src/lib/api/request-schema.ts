import { z } from 'zod';
import { ChangePasswordRequest } from '#lib/api/generated/index.ts';

/**
 * Field rules several request (form) schemas share. Response data is never format-checked
 * (`response-schema.ts`); these are the rules a user's input must meet before it is sent.
 */

/** "Why are you doing this": required, capped at 500. Suspend, delete, anonymise, deactivate, write-off. */
export const reasonField = z.string().min(1, 'Reason is required').max(500);

/**
 * Rule: a web form is never stricter than Go. Go's `email.New` trims, then accepts what `net/mail`
 * parses with a dot in the domain (`josé@example.com`, `u@münchen.de`, `a!b@x.com`), which Zod's
 * `.email()` rejects. So a form field is trimmed and checked for the one shape every address has,
 * `something@something.something` without whitespace; Go has the last word.
 */
export const formEmailField = z
	.string()
	.trim()
	.min(1, 'Email is required')
	.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format');

/**
 * Sign-in and forgot-password: trimmed and non-empty, nothing else. Go answers a malformed address
 * with the same 401 / 204 as an unknown one, so a shape check here would reveal more than Go does.
 */
export const lookupEmailField = z.string().trim().min(1, 'Email is required');

/** The contract's password floor (identical for change-password, create-user and register-tenant). */
const PASSWORD_MIN_LENGTH = ChangePasswordRequest.shape.new_password.minLength ?? 12;

/** A NEW password a user picks. (The current/sign-in password is only checked for presence.) */
export const newPasswordField = z
	.string()
	.min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
