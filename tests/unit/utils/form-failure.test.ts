import { describe, expect, it } from 'vitest';
import { bannerText, fieldText, readFailure } from '#lib/utils/form-failure.ts';

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

describe('fieldText / bannerText', () => {
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

	it('the banner is the translated key, or null', () => {
		expect(bannerText(failure, t)).toBe('T(auth.errors.forbidden)');
		expect(bannerText(readFailure({ fieldKeys: {} }), t)).toBeNull();
		expect(bannerText(null, t)).toBeNull();
	});
});
