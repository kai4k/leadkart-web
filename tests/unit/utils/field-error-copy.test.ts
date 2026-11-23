import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import en from '#lib/i18n/locales/en.json';
import { fieldMessageText } from '#lib/utils/field-error-copy.ts';

const t = (key: string) => get(_)(key);
const text = (m: string) => fieldMessageText(m, t);
const GENERIC = en.form.invalid;

describe('the mapper returns copy or the generic line, never an object or a template', () => {
	it('a namespace key (an object) reads the generic line', () => {
		expect(text('form.errors')).toBe(GENERIC);
		expect(text('form.passwordRule')).toBe(GENERIC);
	});
	it('a sentence with a placeholder reads the generic line', () => {
		expect(text('form.passwordPolicy.length')).toBe(GENERIC);
		expect(text('form.typeToConfirm')).toBe(GENERIC);
	});
	it('a key outside the error namespaces reads the generic line', () => {
		expect(text('auth.signin.title')).toBe(GENERIC);
		expect(text('app.name')).toBe(GENERIC);
	});
	it('a catalogue key in an error namespace is its sentence', () => {
		expect(text('form.errors.slugLength')).toBe(en.form.errors.slugLength);
		expect(text('auth.errors.emailRequired')).toBe(en.auth.errors.emailRequired);
	});
});

describe('Go field codes', () => {
	it.each([
		['invalid_gstin', en.form.errors.gstinInvalid],
		['invalid_pan', en.form.errors.panInvalid],
		['invalid_drug_licence', en.form.errors.drugLicenceInvalid],
		['invalid_phone', 'Enter the number with + and country code, for example +919876543210.'],
		['invalid_pincode', en.form.errors.pinInvalid],
		['invalid_city', en.form.errors.cityPincodeMismatch],
		['invalid_address', en.form.errors.addressInvalid],
		['also_granted', 'A permission cannot be both granted and revoked.'],
		['invalid_characters', 'Remove line breaks, tabs and invisible characters.']
	])('%s', (code, sentence) => {
		expect(text(code)).toBe(sentence);
	});
});

describe('the zod defaults that name a length or a floor', () => {
	it.each([
		['Too big: expected string to have <=500 characters', en.form.tooLong],
		['Too big: expected array to have <=10 items', en.form.tooLong],
		['Too big: expected number to be <=240', en.form.tooLarge],
		['Too small: expected string to have >=1 characters', en.form.required],
		['Too small: expected string to have >=10 characters', en.form.tooShort],
		['Too small: expected number to be >=0', en.form.errors.notNegative],
		['Too small: expected number to be >=1', en.form.errors.atLeastOne],
		['Too small: expected number to be >0', en.form.errors.greaterThanZero],
		['Too small: expected number to be >=5', en.form.tooSmall]
	])('%s', (m, sentence) => {
		expect(text(m)).toBe(sentence);
	});
	it('every other default still reads the generic line', () => {
		for (const m of [
			'Invalid input: expected string, received number',
			'Invalid option: expected one of "a"|"b"',
			'Invalid string: must match pattern /x/',
			'Invalid input'
		])
			expect(text(m), m).toBe(GENERIC);
	});
});

describe('M-7: a one-character company name is valid (Go accepts it); only none is "required"', () => {
	it('reads "required" for none and no message for 1 character', async () => {
		const { registerTenantRequestSchema } =
			await import('#lib/features/operator/tenants/schemas.ts');
		const first = (legal_name: string) =>
			registerTenantRequestSchema
				.safeParse({ legal_name })
				.error?.issues.find((i) => i.path.includes('legal_name'))?.message;
		expect(first('a')).toBeUndefined();
		expect(text(first('')!)).toBe(en.form.required);
	});
});
