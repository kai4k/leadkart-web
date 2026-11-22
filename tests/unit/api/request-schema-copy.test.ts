import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import {
	currentPasswordField,
	formEmailField,
	lookupEmailField,
	newPasswordField,
	reasonField
} from '#lib/api/request-schema.ts';
import { fieldMessageText, isCopyKey } from '#lib/utils/field-error-copy.ts';

/**
 * A request schema is shared by server actions (which cannot call `$_`) and client forms, so its
 * message is the i18n KEY and the renderer translates it: what a user reads is a complete
 * sentence from en.json, never a hard-coded string and never a raw Zod default.
 */
const failing: [string, () => string | undefined][] = [
	['reason empty', () => reasonField.safeParse('').error?.issues[0]?.message],
	['email empty', () => formEmailField.safeParse('  ').error?.issues[0]?.message],
	[
		'email too long',
		() => formEmailField.safeParse(`${'a'.repeat(260)}@x.io`).error?.issues[0]?.message
	],
	['email shape', () => formEmailField.safeParse('nope').error?.issues[0]?.message],
	['lookup empty', () => lookupEmailField.safeParse('').error?.issues[0]?.message],
	['lookup too long', () => lookupEmailField.safeParse('a'.repeat(300)).error?.issues[0]?.message],
	['password empty', () => currentPasswordField().safeParse('').error?.issues[0]?.message],
	[
		'password too long',
		() => currentPasswordField().safeParse('x'.repeat(2000)).error?.issues[0]?.message
	],
	['new password short', () => newPasswordField.safeParse('Ab1!').error?.issues[0]?.message],
	[
		'new password too long',
		() => newPasswordField.safeParse('x'.repeat(2000)).error?.issues[0]?.message
	]
];

describe('request-schema messages', () => {
	it.each(failing)(
		'%s: the message is a catalogue key whose text is a full sentence',
		(_n, run) => {
			const message = run();
			expect(message).toBeTruthy();
			expect(isCopyKey(message!)).toBe(true);
			const text = get(_)(message!, { default: '' });
			expect(text, `no en.json entry for ${message}`).not.toBe('');
			expect(text).toMatch(/\.$/);
			expect(fieldMessageText(message!, (k) => get(_)(k))).toBe(text);
		}
	);

	it('a caller-supplied required message is used as given', () => {
		expect(
			currentPasswordField('auth.errors.currentPasswordRequired').safeParse('').error?.issues[0]
				?.message
		).toBe('auth.errors.currentPasswordRequired');
	});
});

describe('fieldMessageText', () => {
	const t = (k: string) => `T(${k})`;
	it('translates a key, maps an API code, and shows nothing else (a sentence, a default, a missing key)', () => {
		expect(fieldMessageText('auth.errors.emailRequired', t)).toBe('T(auth.errors.emailRequired)');
		expect(fieldMessageText('required', t)).toBe('T(form.required)');
		expect(fieldMessageText('too_long', t)).toBe('T(form.tooLong)');
		// a library default that names a length is read as the rule, not shown
		expect(fieldMessageText('Too small: expected string to have >=12 characters', t)).toBe(
			'T(form.tooShort)'
		);
		for (const raw of [
			'Reason must be at least 10 characters.',
			'Invalid input: expected string, received undefined',
			'',
			'invalid_type'
		])
			expect(fieldMessageText(raw, t), raw).toBe('T(form.invalid)');
	});
	it('a key the catalogue lacks renders form.invalid, not the key', () => {
		// a catalogue lookup that finds nothing answers with the key itself (svelte-i18n)
		const lookup = (k: string) => (k === 'form.invalid' ? 'Check this value.' : k);
		expect(fieldMessageText('form.errors.noSuchKey', lookup)).toBe('Check this value.');
		expect(fieldMessageText('form.invalid', lookup)).toBe('Check this value.');
	});
	it('isCopyKey: dotted camelCase paths only', () => {
		expect(isCopyKey('form.errors.reasonRequired')).toBe(true);
		expect(isCopyKey('Email is required.')).toBe(false);
		expect(isCopyKey('too_small')).toBe(false);
		expect(isCopyKey('a.b')).toBe(true);
		expect(isCopyKey('v1.2')).toBe(false);
	});
});
