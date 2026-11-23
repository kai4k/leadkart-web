import { describe, expect, it } from 'vitest';
import {
	companyNameField,
	formEmailField,
	humanTextField,
	personNameField,
	reasonField,
	requiredText,
	slugField,
	utf8Bytes
} from '#lib/api/request-schema.ts';
import { createRoleRequestSchema } from '#lib/features/roles/schemas.ts';
import { createPermissionRequestSchema } from '#lib/features/permission-requests/schemas.ts';
import { createImpersonationSessionRequestSchema } from '#lib/features/operator/impersonation/schemas.ts';
import { registerTenantRequestSchema } from '#lib/features/operator/tenants/schemas.ts';
import { createUserRequestSchema } from '#lib/features/users/schemas.ts';
import { updateTenantProfileSchema } from '#lib/features/tenant/schemas.ts';

const A = 'अ'; // one Hindi letter: 3 UTF-8 bytes

const firstIssue = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
	result.error?.issues[0]?.message;

describe('requiredText / humanTextField: trim, then measure UTF-8 bytes as Go does', () => {
	it('the Hindi letter is 3 bytes', () => {
		expect(utf8Bytes(A)).toBe(3);
		expect(utf8Bytes('a')).toBe(1);
	});

	it('a blank value (spaces, tabs, line breaks) is required, not "valid"', () => {
		for (const blank of ['', '   ', '\t', ' \n ']) {
			const r = requiredText(100).safeParse(blank);
			expect(r.success).toBe(false);
			expect(firstIssue(r)).toBe('form.required');
		}
	});

	it('the trimmed text is what passes and what is sent', () => {
		expect(requiredText(100).parse('  Ravi  ')).toBe('Ravi');
	});

	it('person names: 100 bytes. 33 Hindi letters (99) pass, 34 (102) are refused (a 34-letter name used to pass at 120)', () => {
		expect(personNameField.safeParse(A.repeat(33)).success).toBe(true);
		const r = personNameField.safeParse(A.repeat(34));
		expect(r.success).toBe(false);
		expect(firstIssue(r)).toBe('form.tooLong');
		expect(personNameField.safeParse('a'.repeat(100)).success).toBe(true);
		expect(personNameField.safeParse('a'.repeat(101)).success).toBe(false);
	});

	it('company names: 200 bytes, one character is enough (Go accepts it)', () => {
		expect(companyNameField.safeParse(A.repeat(66)).success).toBe(true);
		expect(companyNameField.safeParse(A.repeat(67)).success).toBe(false);
		expect(companyNameField.safeParse('A').success).toBe(true);
	});

	it('the minimum is in bytes too: one Hindi letter satisfies Go role-name minimum of 2', () => {
		const role = humanTextField({ min: 2, maxBytes: 100 });
		expect(role.safeParse(A).success).toBe(true);
		const one = role.safeParse('a');
		expect(one.success).toBe(false);
		expect(firstIssue(one)).toBe('form.tooShort');
		// trimmed first: "a " is one byte
		expect(role.safeParse('a ').success).toBe(false);
	});

	it('reasonField trims: spaces are no reason', () => {
		expect(reasonField.safeParse('    ').success).toBe(false);
		expect(firstIssue(reasonField.safeParse('    '))).toBe('form.errors.reasonRequired');
		expect(reasonField.safeParse('a'.repeat(500)).success).toBe(true);
		expect(reasonField.safeParse('a'.repeat(501)).success).toBe(false);
	});
});

describe('the schemas that use them', () => {
	const password = 'Sh1ny.NewOne.Strong!';
	it('add member: first and last name are person names', () => {
		const base = { email: 'a@b.co', password };
		expect(
			createUserRequestSchema.safeParse({ ...base, first_name: A.repeat(34), last_name: 'B' })
				.success
		).toBe(false);
		expect(
			createUserRequestSchema.safeParse({ ...base, first_name: '  ', last_name: 'B' }).success
		).toBe(false);
		expect(
			createUserRequestSchema.parse({ ...base, first_name: ' Ravi ', last_name: 'B' }).first_name
		).toBe('Ravi');
	});

	it('register tenant: company and admin names, and the slug', () => {
		const base = {
			slug: 'acme',
			legal_name: 'Acme Ltd',
			display_name: 'A',
			admin_email: 'a@b.co',
			admin_password: password,
			admin_first_name: 'A',
			admin_last_name: 'B'
		};
		expect(registerTenantRequestSchema.safeParse(base).success).toBe(true);
		expect(
			registerTenantRequestSchema.safeParse({ ...base, legal_name: A.repeat(67) }).success
		).toBe(false);
		expect(
			registerTenantRequestSchema.safeParse({ ...base, admin_first_name: A.repeat(34) }).success
		).toBe(false);
		expect(registerTenantRequestSchema.safeParse({ ...base, slug: 'ab' }).success).toBe(false);
		expect(registerTenantRequestSchema.parse({ ...base, slug: ' acme ' }).slug).toBe('acme');
	});

	it('tenant profile names are company names', () => {
		expect(
			updateTenantProfileSchema.safeParse({ legal_name: '   ', display_name: 'x' }).success
		).toBe(false);
		expect(
			updateTenantProfileSchema.safeParse({ legal_name: A.repeat(67), display_name: 'x' }).success
		).toBe(false);
	});

	it('role name: 2-100 bytes after trimming', () => {
		const level = { hierarchy_level: 50 };
		expect(createRoleRequestSchema.safeParse({ ...level, name: ' a ' }).success).toBe(false);
		expect(createRoleRequestSchema.safeParse({ ...level, name: '  ' }).success).toBe(false);
		expect(createRoleRequestSchema.parse({ ...level, name: ' Sales lead ' }).name).toBe(
			'Sales lead'
		);
		expect(createRoleRequestSchema.safeParse({ ...level, name: 'a'.repeat(101) }).success).toBe(
			false
		);
	});

	it('impersonation reason: ten spaces are not a reason; ten characters are', () => {
		const base = { target_tenant_id: 't' };
		expect(
			createImpersonationSessionRequestSchema.safeParse({ ...base, reason: ' '.repeat(10) }).success
		).toBe(false);
		expect(
			createImpersonationSessionRequestSchema.safeParse({ ...base, reason: '0123456789' }).success
		).toBe(true);
		// the same audit reason as a permission request: 1024 bytes, not the 500 the form used to cut at
		expect(
			createImpersonationSessionRequestSchema.safeParse({ ...base, reason: 'a'.repeat(1024) })
				.success
		).toBe(true);
		expect(
			createImpersonationSessionRequestSchema.safeParse({ ...base, reason: 'a'.repeat(1025) })
				.success
		).toBe(false);
	});

	it('permission request reason: 10 to 1024 after trimming ("   abcd      " used to pass)', () => {
		const base = { permission: 'crm.leads.read' };
		expect(
			createPermissionRequestSchema.safeParse({ ...base, reason: '   abcd      ' }).success
		).toBe(false);
		expect(
			createPermissionRequestSchema.safeParse({ ...base, reason: 'a'.repeat(1024) }).success
		).toBe(true);
		expect(
			createPermissionRequestSchema.safeParse({ ...base, reason: 'a'.repeat(1025) }).success
		).toBe(false);
	});
});

/** internal/common/slug/slug_test.go at 44ff2b16. */
describe('slugField: Go common/slug', () => {
	const accepts = [
		'abc',
		'acme-co',
		'acme-co-2',
		'a1b',
		'acme',
		'01-acme',
		'super-long-tenant-name-that-fits-within-the-63-char-rfc1035-cap'
	];
	const rejects = [
		'',
		'   ',
		'ab',
		'a',
		'a'.repeat(64),
		'Acme',
		'acme_co',
		'acme co',
		'-acme',
		'acme-',
		'acme--co',
		'açme',
		'acme.co',
		'acme/co'
	];
	it.each(accepts)('accepts %s', (slug) => {
		expect(slugField.parse(slug)).toBe(slug);
	});
	it.each(rejects)('rejects %j', (slug) => {
		expect(slugField.safeParse(slug).success).toBe(false);
	});
	it('the long example is 63 characters, one more is refused with the length message', () => {
		expect(accepts[6]!.length).toBe(63);
		expect(firstIssue(slugField.safeParse(`${accepts[6]}x`))).toBe('form.errors.slugLength');
	});
	it('trims as Go does, and says which rule broke', () => {
		expect(slugField.parse(' acme ')).toBe('acme');
		expect(firstIssue(slugField.safeParse('ab'))).toBe('form.errors.slugLength');
		expect(firstIssue(slugField.safeParse('Acme'))).toBe('form.errors.slugCharacters');
		expect(firstIssue(slugField.safeParse('acme--co'))).toBe('form.errors.slugDoubleHyphen');
	});
});

/** internal/common/email/email_test.go at 44ff2b16, plus the shapes net/mail refuses that the old pattern let through. */
describe('formEmailField: never stricter than Go, and no longer blind to the obvious', () => {
	const goAccepts = [
		'alice@example.com',
		'user.name+tag@example.co.in',
		'a@b.io',
		'firstname.lastname@subdomain.example.org',
		'Alice@Example.COM',
		'josé@example.com',
		'u@münchen.de',
		'a!b@x.com',
		'u@ex_ample.com',
		'u@x.c',
		"o'brien@example.in"
	];
	const goRejects = [
		'alice.example.com',
		'@example.com',
		'alice@',
		'alice@example',
		'ali ce@example.com',
		'a..b@x.com',
		'.a@x.com',
		'a.@x.com',
		'a,b@x.com',
		'a@b.c,',
		'a@b..c',
		'a@.b.c'
	];
	it.each(goAccepts)('accepts %s', (email) => {
		expect(formEmailField.safeParse(email).success).toBe(true);
	});
	it.each(goRejects)('rejects %s', (email) => {
		expect(formEmailField.safeParse(email).success).toBe(false);
	});
	it('a 255-character address is refused before the pattern runs', () => {
		const email = `${'a'.repeat(245)}@example.com`;
		expect(firstIssue(formEmailField.safeParse(email))).toBe('auth.errors.emailTooLong');
	});
});
