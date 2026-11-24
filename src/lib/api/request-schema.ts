import { z } from 'zod';
import { ChangePasswordRequest } from '#lib/api/generated/index.ts';

/**
 * Field rules several request (form) schemas share: what a user's input must meet before it is sent.
 * Response data is never format-checked (the generated DTOs carry no `format: email`).
 * A message here is an i18n KEY, not a sentence: server actions share these schemas and cannot call
 * `$_`, so the key travels and the renderer (`fieldMessageText`) translates it.
 */

/** Go's `len(string)`: UTF-8 BYTES. A Hindi letter is 3 of them, so a limit in characters is wrong in both directions. */
export const utf8Bytes = (text: string): number => new TextEncoder().encode(text).length;

/**
 * Text a person types that other people read as a name, a title or a reason: trimmed FIRST (Go refuses a blank value
 * after `TrimSpace`, and a person reads "   " as nothing), then required, then measured in UTF-8 bytes as Go does,
 * so a 34-letter Hindi name is refused here and not by a 422. The trimmed text is what is measured and what is sent.
 * `min` is in bytes as well (Go's role name: `len(trimmed) >= 2`).
 * Messages are catalogue keys: `form.required` (blank), `form.tooShort`, `form.tooLong`.
 */
export function humanTextField(rule: {
	min?: number;
	maxBytes: number;
	requiredMessage?: string;
	tooShortMessage?: string;
	tooLongMessage?: string;
}) {
	const {
		min = 1,
		maxBytes,
		requiredMessage = 'form.required',
		tooShortMessage = 'form.tooShort',
		tooLongMessage = 'form.tooLong'
	} = rule;
	return z
		.string()
		.trim()
		.min(1, { error: requiredMessage, abort: true })
		.refine((text) => utf8Bytes(text) >= min, { error: tooShortMessage, abort: true })
		.refine((text) => utf8Bytes(text) <= maxBytes, tooLongMessage);
}

/** A required, trimmed text of at most `maxBytes` bytes. */
export const requiredText = (maxBytes: number, requiredMessage?: string) =>
	humanTextField({ maxBytes, requiredMessage });

/** "Why are you doing this": required after trimming, capped at 500 bytes. Suspend, delete, deactivate, write-off. */
export const reasonField = requiredText(500, 'form.errors.reasonRequired');

/**
 * A reason kept on the audit trail (an impersonation session, a permission request): at least 10 bytes AFTER trimming
 * (ten spaces are no reason), at most 1024. Go's `impersonation.MinReasonLength` and `permissionrequest` 10-1024.
 */
export const auditReasonField = humanTextField({
	min: 10,
	maxBytes: 1024,
	requiredMessage: 'form.errors.reasonTooShort',
	tooShortMessage: 'form.errors.reasonTooShort'
});

/** A person's first or last name: Go caps each at 100 bytes (`person.nameMaxLen`) and refuses a blank one. */
export const personNameField = requiredText(100);

/** A company's legal or display name: Go caps each at 200 bytes (`tenant.nameMaxLen`) and refuses a blank one. */
export const companyNameField = requiredText(200);

/** Go's maximum email length (RFC 5321 path limit). */
const EMAIL_MAX_LENGTH = 254;

/**
 * The shape `net/mail` plus Go's `email.New` accepts, read the other way round: a local part and a domain of
 * dot-separated atoms (no empty atom, so `a..b@x.com` and `.a@x.com` are out), none holding whitespace, `@`, quotes,
 * commas, colons, semicolons, angle or round brackets, square brackets or backslashes; a quoted local part or an address
 * literal domain is let through. Held against Go's own samples in the unit test: NEVER stricter than Go. Linear: no atom
 * contains a dot, so every split has one way.
 */
const ATOM = String.raw`[^\s@",:;<>()[\]\\.]+`;
const EMAIL_SHAPE = new RegExp(
	String.raw`^(?:"[^"\s]+"|${ATOM}(?:\.${ATOM})*)@(?:\[[^\s\]]+\]|${ATOM}(?:\.${ATOM})+)$`,
	'u'
);

/**
 * A slug (a tenant's address): trimmed as Go trims it, 3 to 63, lower-case letters, digits and single hyphens,
 * starting and ending with a letter or digit (`common/slug`). The input's `maxlength` is 63, never 60.
 */
export const SLUG_MIN = 3;
export const SLUG_MAX = 63;
const SLUG_SHAPE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const DOUBLE_HYPHEN = /--/;
export const slugField = z
	.string()
	.trim()
	.min(1, { error: 'form.required', abort: true })
	.refine((slug) => utf8Bytes(slug) >= SLUG_MIN && utf8Bytes(slug) <= SLUG_MAX, {
		error: 'form.errors.slugLength',
		abort: true
	})
	.regex(SLUG_SHAPE, 'form.errors.slugCharacters')
	.refine((slug) => !DOUBLE_HYPHEN.test(slug), 'form.errors.slugDoubleHyphen');

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
	.regex(EMAIL_SHAPE, 'auth.changeEmail.errors.invalid');

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
