import { describe, expect, it } from 'vitest';
import { formEmailField, lookupEmailField } from '#lib/api/request-schema.ts';
import { loginRequestSchema } from '#lib/features/auth/schemas.ts';
import { updateLeadSchema } from '#lib/features/leads/schemas.ts';
import { registerTenantRequestSchema } from '#lib/features/operator/tenants/schemas.ts';
import { createUserRequestSchema } from '#lib/features/users/schemas.ts';

/**
 * Rule: a web form is never stricter than Go. Go's `email.New` trims, then accepts anything
 * `net/mail` parses with a dot in the domain, so these all reach Go from every form.
 */
const GO_ACCEPTS = ['josé@example.com', 'u@münchen.de', 'a!b@x.com', 'u@ex_ample.com', 'u@x.c'];
const MALFORMED = ['', '   ', 'not-an-email', 'a@', '@b.co', 'a b@c.de', 'a@b'];

describe('formEmailField', () => {
	it.each(GO_ACCEPTS)('accepts %s', (email) => {
		expect(formEmailField.safeParse(email).success).toBe(true);
	});

	it('trims surrounding whitespace (Go trims too)', () => {
		expect(formEmailField.parse('  a@b.co \n')).toBe('a@b.co');
	});

	it.each(MALFORMED)('rejects %j', (email) => {
		expect(formEmailField.safeParse(email).success).toBe(false);
	});
});

describe('lookupEmailField (sign-in, forgot-password)', () => {
	it('trims and requires non-empty, nothing more: Go answers a malformed address like an unknown one', () => {
		expect(lookupEmailField.parse(' not-an-email ')).toBe('not-an-email');
		expect(lookupEmailField.safeParse('').success).toBe(false);
		expect(lookupEmailField.safeParse('   ').success).toBe(false);
	});
});

describe('every form schema uses the shared email rule', () => {
	const user = { password: 'Sh1ny.NewOne.Strong!', first_name: 'A', last_name: 'B' };
	const tenant = {
		slug: 'acme',
		legal_name: 'Acme Ltd',
		display_name: 'Acme',
		admin_password: 'Sh1ny.NewOne.Strong!',
		admin_first_name: 'A',
		admin_last_name: 'B'
	};

	it.each(GO_ACCEPTS)('%s passes login, create user, register tenant, lead update', (email) => {
		expect(loginRequestSchema.safeParse({ email, password: 'x' }).success).toBe(true);
		expect(createUserRequestSchema.safeParse({ ...user, email }).success).toBe(true);
		expect(registerTenantRequestSchema.safeParse({ ...tenant, admin_email: email }).success).toBe(
			true
		);
		expect(updateLeadSchema.safeParse({ email }).success).toBe(true);
	});

	it('trims padded input in every one', () => {
		expect(loginRequestSchema.parse({ email: ' a@b.co ', password: 'x' }).email).toBe('a@b.co');
		expect(createUserRequestSchema.parse({ ...user, email: ' a@b.co ' }).email).toBe('a@b.co');
		expect(
			registerTenantRequestSchema.parse({ ...tenant, admin_email: ' a@b.co ' }).admin_email
		).toBe('a@b.co');
		expect(updateLeadSchema.parse({ email: ' a@b.co ' }).email).toBe('a@b.co');
	});

	it('rejects an empty or malformed address (sign-in only needs non-empty)', () => {
		expect(loginRequestSchema.safeParse({ email: '', password: 'x' }).success).toBe(false);
		expect(createUserRequestSchema.safeParse({ ...user, email: 'nope' }).success).toBe(false);
		expect(registerTenantRequestSchema.safeParse({ ...tenant, admin_email: '' }).success).toBe(
			false
		);
		expect(updateLeadSchema.safeParse({ email: 'nope' }).success).toBe(false);
		expect(updateLeadSchema.safeParse({ email: '' }).success).toBe(true);
	});

	it('sign-in does not reveal more than Go: a malformed address is sent, not rejected', () => {
		expect(loginRequestSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(
			true
		);
	});
});
