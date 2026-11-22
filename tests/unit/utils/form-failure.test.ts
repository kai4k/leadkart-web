import { describe, expect, it } from 'vitest';
import { fieldText, readFailure } from '#lib/utils/form-failure.ts';

const t = (key: string) => `T(${key})`;

describe('readFailure', () => {
	it('is null for no result and for a success result', () => {
		expect(readFailure(null)).toBeNull();
		expect(readFailure(undefined)).toBeNull();
		expect(readFailure({ success: true })).toBeNull();
		expect(readFailure({ submitted: true })).toBeNull();
	});

	it('fills the parts a failure left out', () => {
		expect(readFailure({ formErrorKey: 'k' })).toEqual({
			values: {},
			fieldKeys: {},
			fieldMessages: {},
			formErrorKey: 'k'
		});
	});
});

describe('fieldText', () => {
	const failure = readFailure({
		fieldKeys: { email: 'auth.errors.emailRequired' },
		fieldMessages: { email: 'schema text', name: 'Go says too long' },
		formErrorKey: 'auth.errors.forbidden'
	});

	it('a key is translated and wins; else the message that came with the field', () => {
		expect(fieldText(failure, 'email', t)).toBe('T(auth.errors.emailRequired)');
		expect(fieldText(failure, 'name', t)).toBe('Go says too long');
		expect(fieldText(failure, 'other', t)).toBeUndefined();
		expect(fieldText(null, 'email', t)).toBeUndefined();
	});
});

describe('fieldText: a schema message that is an i18n key is translated, an API code is mapped', () => {
	it('keys in fieldMessages reach the screen as catalogue text', () => {
		const failure = readFailure({
			fieldMessages: { email: 'auth.errors.emailRequired', name: 'required', note: 'A sentence.' }
		});
		expect(fieldText(failure, 'email', t)).toBe('T(auth.errors.emailRequired)');
		expect(fieldText(failure, 'name', t)).toBe('T(form.required)');
		expect(fieldText(failure, 'note', t)).toBe('A sentence.');
	});
});
