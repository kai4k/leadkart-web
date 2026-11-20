import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkParity, enabledLocalesFrom } from '../../../scripts/arch/check-locale-parity.mjs';

const en = { a: { b: 'B', c: 'C' }, d: 'D' };

describe('check-locale-parity: enabled locales only (English only for now)', () => {
	it('a disabled locale missing keys is REPORTED, never failed', () => {
		const { errors, notes } = checkParity({ en, hi: { a: { b: 'ब' } } }, ['en']);
		expect(errors).toEqual([]);
		expect(notes.join('\n')).toContain('hi.json (disabled locale, reported only): 2 key(s)');
	});
	it('a disabled locale with an orphan key is reported, not failed', () => {
		const { errors, notes } = checkParity({ en, hi: { ...en, z: 'Z' } }, ['en']);
		expect(errors).toEqual([]);
		expect(notes.join('\n')).toContain('1 key(s) are not in en.json');
	});
	it('the same drift FAILS once the locale is enabled', () => {
		const { errors } = checkParity({ en, hi: { a: { b: 'ब' }, z: 'Z' } }, ['en', 'hi']);
		expect(errors).toContain('hi.json: missing key "a.c"');
		expect(errors).toContain('hi.json: missing key "d"');
		expect(errors).toContain('hi.json: orphan key "z" (not in en.json)');
	});
	it('an empty value fails in en and in an enabled locale, not in a disabled one', () => {
		expect(checkParity({ en: { a: '' } }, ['en']).errors).toContain('en.json: empty value at "a"');
		expect(checkParity({ en: { a: 'A' }, hi: { a: '' } }, ['en', 'hi']).errors).toContain(
			'hi.json: empty value at "a"'
		);
		expect(checkParity({ en: { a: 'A' }, hi: { a: '' } }, ['en']).errors).toEqual([]);
	});
	it('an enabled locale with no file fails; en must be enabled', () => {
		expect(checkParity({ en }, ['en', 'hi']).errors).toContain('hi.json: enabled but missing');
		expect(checkParity({ en }, ['hi']).errors.join()).toContain('must contain "en"');
	});
	it('reads the enabled list from the TypeScript constant, and the repo ships English only', () => {
		expect(
			enabledLocalesFrom("export const ENABLED_LOCALES: readonly AppLocale[] = ['en', 'hi'];")
		).toEqual(['en', 'hi']);
		expect(enabledLocalesFrom('nothing here')).toBeNull();
		expect(enabledLocalesFrom(readFileSync('src/lib/i18n/index.ts', 'utf8'))).toEqual(['en']);
	});
});
