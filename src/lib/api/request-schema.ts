import { z } from 'zod';
import { ChangePasswordRequest } from '#lib/api/generated/index.ts';

/**
 * Field rules several request (form) schemas share: what a user's input must meet before it is sent.
 * Response data is never format-checked (the generated DTOs carry no `format: email`).
 * A message here is an i18n KEY, not a sentence: server actions share these schemas and cannot call
 * `$_`, so the key travels and the renderer (`fieldMessageText`) translates it.
 */

/** "Why are you doing this": required, capped at 500. Suspend, delete, anonymise, deactivate, write-off. */
export const reasonField = z.string().min(1, 'form.errors.reasonRequired').max(500, 'form.tooLong');

/** Go's maximum email length (RFC 5321 path limit). */
const EMAIL_MAX_LENGTH = 254;

/**
 * Rule: a web form is never stricter than Go. Go's `email.New` trims, then accepts what `net/mail`
 * parses with a dot in the domain (`josé@example.com`, `u@münchen.de`, `a!b@x.com`), which Zod's
 * `.email()` rejects. So a form field is trimmed and checked for the one shape every address has,
 * `something@something.something` without whitespace; Go has the last word.
 */
export const formEmailField = z
	.string()
	.trim()
	.min(1, 'auth.errors.emailRequired')
	// Go's own cap. Checked BEFORE the pattern (abort) so an oversized body never reaches it.
	.max(EMAIL_MAX_LENGTH, { error: 'auth.errors.emailTooLong', abort: true })
	// Linear: no label can contain a dot, so the domain splits one way only (no backtracking).
	.regex(/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/, 'auth.changeEmail.errors.invalid');

/**
 * Sign-in and forgot-password: trimmed, non-empty and at most 254 characters (Go's cap; nothing
 * else). Go answers a malformed address
 * with the same 401 / 204 as an unknown one, so a shape check here would reveal more than Go does.
 */
export const lookupEmailField = z
	.string()
	.trim()
	.min(1, 'auth.errors.emailRequired')
	.max(EMAIL_MAX_LENGTH, 'auth.errors.emailTooLong');

/**
 * Ceilings on what a PRE-LOGIN (or any password-bearing) request may carry. Without them a body up
 * to the 512 KB request limit would reach Go's password hasher. Plain lengths, no pattern.
 */
const PASSWORD_MAX_LENGTH = 1024;
const TOKEN_MAX_LENGTH = 512;

/** The sign-in password (and any "current password"): present, and not absurdly long. Nothing else is Go's call. */
export const currentPasswordField = (requiredMessage = 'auth.errors.passwordRequired') =>
	z.string().min(1, requiredMessage).max(PASSWORD_MAX_LENGTH, 'auth.errors.passwordTooLong');

/** An emailed / URL token (password reset, email change): present, and at most 512 characters. */
export const tokenField = z.string().min(1).max(TOKEN_MAX_LENGTH);

/** The contract's password floor (identical for change-password, create-user and register-tenant). */
const PASSWORD_MIN_LENGTH = ChangePasswordRequest.shape.new_password.minLength ?? 12;

/** A NEW password a user picks. (The current/sign-in password is only checked for presence.) */
export const newPasswordField = z
	.string()
	.min(PASSWORD_MIN_LENGTH, 'form.errors.passwordTooShort')
	.max(PASSWORD_MAX_LENGTH, 'auth.errors.passwordTooLong');
