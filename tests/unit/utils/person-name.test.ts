import { describe, expect, it } from 'vitest';
import { displayName, initials } from '#lib/utils/person-name.ts';

const base = { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@acme.test' };

describe('displayName', () => {
	it('joins first and last when both are present (trimmed)', () => {
		expect(displayName({ ...base, first_name: ' Ada ', last_name: ' Lovelace ' })).toBe(
			'Ada Lovelace'
		);
	});
	it('uses the single non-blank name part', () => {
		expect(displayName({ ...base, last_name: '  ' })).toBe('Ada');
		expect(displayName({ ...base, first_name: '' })).toBe('Lovelace');
	});
	it('falls back to the email local-part when both names are blank', () => {
		expect(displayName({ ...base, first_name: '', last_name: ' ' })).toBe('ada');
	});
	it('falls back to the full email when asked', () => {
		expect(displayName({ ...base, first_name: '', last_name: '' }, { emailFallback: 'full' })).toBe(
			'ada@acme.test'
		);
	});
	it('returns the email itself when there is no local-part separator', () => {
		expect(displayName({ first_name: '', last_name: '', email: 'nobody' })).toBe('nobody');
	});
});

describe('initials', () => {
	it('uses first letters of two words', () => {
		expect(initials('Ada Lovelace')).toBe('AL');
	});
	it('uses the first letter of a single word', () => {
		expect(initials('Ada')).toBe('A');
	});
	it('uses first + last word for three words', () => {
		expect(initials('Ada King Lovelace')).toBe('AL');
	});
	it('ignores extra whitespace', () => {
		expect(initials('  ada   lovelace  ')).toBe('AL');
	});
	it('uppercases lowercase input', () => {
		expect(initials('ada lovelace')).toBe('AL');
	});
	it('returns the fallback (default "?") for blank input', () => {
		expect(initials('   ')).toBe('?');
		expect(initials('')).toBe('?');
	});
});
