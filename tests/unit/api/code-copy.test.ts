/**
 * ONE table maps a Go (or BFF) error code to an i18n key. The client describer (toasts, banners) and
 * the server-action failure helper both read it, so a form that posts through a server action tells
 * the user the same thing as one that posts through the API client. Status-class keys stay the
 * fallback for a code the table does not know. No text here is Go's.
 */
import { describe, expect, it } from 'vitest';
import en from '#lib/i18n/locales/en.json';
import { ApiError, describeError } from '#lib/api/errors.ts';
import { codeCopy, GO_CODE_KEYS, goCodeKey } from '#lib/api/code-copy.ts';
import { goFailureKey } from '#lib/server/form-action.ts';

const dig = (tree: unknown, key: string): unknown =>
	key
		.split('.')
		.reduce<unknown>((n, part) => (n as Record<string, unknown> | undefined)?.[part], tree);

describe('the code table', () => {
	it('has an English line for every key, none of them empty', () => {
		expect(GO_CODE_KEYS.size).toBeGreaterThan(25);
		for (const [code, key] of GO_CODE_KEYS) {
			// English only for now (L46): hi.json is frozen and not asserted
			for (const [name, locale] of [['en', en]] as const) {
				const text = dig(locale, key);
				expect(typeof text, `${name} ${code}`).toBe('string');
				expect((text as string).trim().length, `${name} ${code}`).toBeGreaterThan(0);
			}
		}
	});

	it('covers every code the web can receive that used to fall back to generic copy', () => {
		for (const code of [
			'email_already_taken',
			'email_has_active_membership',
			'permission_request_pending_exists',
			'permission_request_not_pending',
			'platform_tenant_undeletable',
			'role_hierarchy_cycle',
			'role_hierarchy_self_reference',
			'role_hierarchy_edge_already_exists',
			'concurrency_conflict',
			'person_active_elsewhere',
			'scope_changed',
			'scope_invalid'
		]) {
			expect(goCodeKey(code), code).toBe(`errors.code.${code}`);
		}
		expect(codeCopy('email_has_active_membership')).toBe(
			'This email is active in another company. It must be deactivated there before it can be added here.'
		);
		expect(codeCopy('person_active_elsewhere')).toBe(
			'This person is active in another company. They must be deactivated there before they can be reactivated here.'
		);
	});

	it('a code Go no longer sends has no copy (ADR 0069: no not_approver, no role_deleted)', () => {
		for (const gone of ['not_approver', 'role_deleted'])
			expect(goCodeKey(gone), gone).toBeUndefined();
	});

	it('the corrected lines: insufficient_rank covers roles, role_level_breaks_reporting both directions', () => {
		expect(codeCopy('insufficient_rank')).toBe(
			'You can only do this for people and roles below your own level.'
		);
		expect(codeCopy('role_level_breaks_reporting')).toBe(
			'That level would break a reporting line — a manager must stay above the people who report to them.'
		);
	});

	it('user copy says "company", not "tenant", except the operator-facing tenant-context lines', () => {
		const operatorFacing = new Set([
			'tenant_scope_not_supported',
			'tenant_scope_read_only',
			'tenant_scope_forbidden',
			'tenant_scope_conflict',
			'tenant_not_active',
			'scope_changed',
			'scope_invalid'
		]);
		for (const [code, key] of GO_CODE_KEYS) {
			if (operatorFacing.has(code)) continue;
			expect(String(dig(en, key)).toLowerCase(), code).not.toContain('tenant');
		}
	});

	it('before a locale is ready the answer is the short built-in line, never the key', () => {
		expect(codeCopy('role_name_taken')).toBeDefined();
		expect(codeCopy('not_a_code')).toBeUndefined();
	});

	it('knows the codes this round brings and role_name_taken', () => {
		for (const code of [
			'ownership_authority_required',
			'role_level_breaks_reporting',
			'person_memberships_changing',
			'role_name_taken',
			'insufficient_rank',
			'grant_exceeds_authority',
			'impersonation_not_allowed'
		]) {
			expect(goCodeKey(code), code).toBeDefined();
		}
		expect(goCodeKey('some_new_code')).toBeUndefined();
	});

	// Go: internal/identity/ports/authn/session_policy.go:13, 403 on every route but change-password and
	// capabilities while the flag is set (BFF_API_CHANGES row 23). It used to read "You don't have permission".
	it('password_change_required says what to do, to the client and to a server action alike', () => {
		expect(goFailureKey(403, 'password_change_required')).toBe(
			'errors.code.password_change_required'
		);
		expect(dig(en, 'errors.code.password_change_required')).toBe('Set a new password to continue.');
		const err = ApiError.fromResponse(new Response(null, { status: 403 }), {
			error: 'password_change_required'
		});
		expect(describeError(err)).toBe('Set a new password to continue.');
	});

	it('the server helper and the client describer say the same thing for a code', () => {
		for (const code of ['insufficient_rank', 'role_name_taken', 'grant_exceeds_authority']) {
			const key = goFailureKey(403, code);
			const err = ApiError.fromResponse(new Response(null, { status: 403 }), { error: code });
			expect(describeError(err)).toBe(dig(en, key));
		}
	});

	it('an unknown code falls back to its status class (never Go text)', () => {
		expect(goFailureKey(403, 'some_new_code')).toBe('auth.errors.forbidden');
		expect(goFailureKey(409, 'some_new_code')).toBe('auth.errors.conflict');
		expect(goFailureKey(403)).toBe('auth.errors.forbidden');
		expect(goFailureKey(429, 'insufficient_rank')).toBe('auth.errors.rateLimited');
	});
});

describe('current_session_unknown', () => {
	it('never promises that a reload fixes it (a reload resends the same token): it says to sign in again', () => {
		const text = (en as { errors: { code: Record<string, string> } }).errors.code
			.current_session_unknown;
		expect(text).not.toMatch(/reload/i);
		expect(text).toMatch(/sign in again/i);
	});
});
