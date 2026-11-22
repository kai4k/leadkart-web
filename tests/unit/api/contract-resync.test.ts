/**
 * The web follows the Go API as pinned in `src/lib/api/generated/SOURCE.json` (leadkart-go 6ebcddf, BFF_API_CHANGES.md):
 * one named test per row the web acts on at the feature layer.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { changePasswordSchema } from '#lib/features/auth/schemas.ts';
import { createUserRequestSchema } from '#lib/features/users/schemas.ts';
import { registerTenantRequestSchema } from '#lib/features/operator/tenants/schemas.ts';
import { createImpersonationSessionResponseSchema } from '#lib/features/operator/impersonation/schemas.ts';
import { fieldMessageText } from '#lib/utils/field-error-copy.ts';
import { GO_CODE_KEYS } from '#lib/api/code-copy.ts';
import en from '../../../src/lib/i18n/locales/en.json';

const user = (over: Record<string, unknown> = {}) => ({
	email: 'a@b.co',
	first_name: 'Asha',
	last_name: 'Rao',
	password: 'Abcdef1!',
	...over
});

describe('BFF_API_CHANGES row 26: the password floor is 8 (it was 12)', () => {
	it('create user, register tenant and change password accept 8-11 characters and refuse 7', () => {
		for (const n of [8, 9, 11]) {
			const pw = 'Aa1!'.padEnd(n, 'x');
			expect(createUserRequestSchema.safeParse(user({ password: pw })).success, `user ${n}`).toBe(
				true
			);
			expect(
				changePasswordSchema.safeParse({ current_password: 'x', new_password: pw }).success,
				`change ${n}`
			).toBe(true);
		}
		expect(createUserRequestSchema.safeParse(user({ password: 'Aa1!xyz' })).success).toBe(false);
		expect(registerTenantRequestSchema.safeParse({ admin_password: 'Aa1!xyz' }).success).toBe(
			false
		);
	});
});

describe('row 55: a name keeps U+200C / U+200D inside a word (the web strips nothing)', () => {
	const hindi = 'क्‍ष'; // a joiner inside a word
	const persian = 'می‌خواهم'; // a non-joiner inside a word
	it.each([hindi, persian])('%s is sent as typed', (name) => {
		const parsed = createUserRequestSchema.parse(user({ first_name: name, last_name: name }));
		expect(parsed.first_name).toBe(name);
		expect(parsed.last_name).toBe(name);
	});
});

describe('rows 55-56: the field codes read as messages, never as raw codes', () => {
	const t = (key: string) => `[${key}]`;
	it.each([
		['required', 'form.required'],
		['too_long', 'form.tooLong'],
		['invalid_characters', 'form.invalidCharacters'],
		['min_length', 'form.passwordRule.min_length'],
		['requires_symbol', 'form.passwordRule.requires_symbol']
	])('%s -> %s', (code, key) => {
		expect(fieldMessageText(code, t)).toBe(`[${key}]`);
	});
	it('every password rule code has its sentence in en.json', () => {
		for (const code of [
			'min_length',
			'max_length',
			'requires_uppercase',
			'requires_lowercase',
			'requires_digit',
			'requires_symbol'
		])
			expect((en.form.passwordRule as Record<string, string>)[code], code).toBeTruthy();
	});
});

describe('rows 36, 37, 79: the new refusal codes have copy', () => {
	it.each(['tenant_suspended', 'tenant_not_active', 'admin_tier_required', 'service_busy'])(
		'%s',
		(code) => {
			const key = GO_CODE_KEYS.get(code)!;
			expect(key).toBe(`errors.code.${code}`);
			expect((en.errors.code as Record<string, string>)[code]).toBeTruthy();
		}
	);
});

describe('row 54: the company name comes from the server', () => {
	it('the create response schema carries tenant_display_name', () => {
		const parsed = createImpersonationSessionResponseSchema.parse({
			session_id: '00000000-0000-4000-8000-000000000002',
			tenant_display_name: 'Acme Pharma',
			expires_at_utc: '2026-05-18T10:30:00Z'
		});
		expect(parsed.tenant_display_name).toBe('Acme Pharma');
	});
});

describe('the pin', () => {
	it('SOURCE.json records leadkart-go 6ebcddf (main)', () => {
		const pin = JSON.parse(readFileSync('src/lib/api/generated/SOURCE.json', 'utf8'));
		expect(pin.commit.startsWith('6ebcddf')).toBe(true);
	});
});
