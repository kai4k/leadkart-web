// @vitest-environment node
/**
 * The sign-in notice: a fixed list of names and a sentence for each. (Setting, taking and clearing
 * the cookie: tests/unit/server/cookies.test.ts and signin-notice-load.test.ts.)
 */
import { describe, expect, it } from 'vitest';
import {
	SIGNIN_NOTICE_COOKIE,
	SIGNIN_NOTICE_KEYS,
	SIGNIN_NOTICE_PATH,
	SIGNIN_NOTICES,
	signinNoticeOf
} from '#lib/api/signin-notice.ts';
import en from '../../../src/lib/i18n/locales/en.json';

const at = (key: string): unknown =>
	key.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], en);

describe('the allow-list', () => {
	it('is exactly the four names, on the sign-in path', () => {
		expect([...SIGNIN_NOTICES]).toEqual([
			'session_expired',
			'tenant_suspended',
			'tenant_not_active',
			'password_changed'
		]);
		expect(SIGNIN_NOTICE_COOKIE).toBe('lk_signin_notice');
		expect(SIGNIN_NOTICE_PATH).toBe('/signin');
	});

	it.each(SIGNIN_NOTICES)('%s names itself', (name) => {
		expect(signinNoticeOf(name)).toBe(name);
	});

	it.each([
		['an unknown reason', 'idle_timeout'],
		['a near miss', 'Session_Expired'],
		['a name with a tail', 'session_expired; Path=/'],
		['markup', '<script>alert(1)</script>'],
		['a token-shaped value', 'eyJhbGciOiJIUzI1NiJ9.e30.x'],
		['an inherited property name', 'constructor'],
		['empty', ''],
		['missing', undefined],
		['null', null],
		['a number', 1],
		['an object', { reason: 'session_expired' }]
	])('%s names nothing', (_label, value) => {
		expect(signinNoticeOf(value)).toBeNull();
	});

	it('every notice has a complete sentence in en.json, ending with a full stop', () => {
		expect(Object.keys(SIGNIN_NOTICE_KEYS).sort()).toEqual([...SIGNIN_NOTICES].sort());
		expect({
			session_expired: at(SIGNIN_NOTICE_KEYS.session_expired),
			tenant_suspended: at(SIGNIN_NOTICE_KEYS.tenant_suspended),
			tenant_not_active: at(SIGNIN_NOTICE_KEYS.tenant_not_active),
			password_changed: at(SIGNIN_NOTICE_KEYS.password_changed)
		}).toEqual({
			session_expired: 'Your session ended. Sign in again.',
			tenant_suspended:
				"Your company's account is suspended. Contact your administrator or LeadKart support.",
			tenant_not_active:
				"Your company's account is not active. Contact your administrator or LeadKart support.",
			password_changed: 'Your password was changed. Sign in with your new password.'
		});
	});

	it('never reads the operator-scope sentence for a company that is not active', () => {
		expect(Object.values(SIGNIN_NOTICE_KEYS).some((k) => k.startsWith('errors.code.'))).toBe(false);
	});
});
