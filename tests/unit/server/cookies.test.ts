import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	clearAuthCookies,
	clearSigninNotice,
	setAuthCookies,
	setMustChangePassword,
	setSigninNotice,
	takeSigninNotice
} from '#lib/server/cookies.ts';
import { SIGNIN_NOTICES } from '#lib/api/signin-notice.ts';

// The one switch the cookies read for `Secure` and the `__Host-` prefix: off (dev / test) unless a test turns it on.
const prod = vi.hoisted(() => ({ on: false }));
vi.mock('#lib/server/config.ts', () => ({ isProd: () => prod.on }));
afterEach(() => {
	prod.on = false;
});

type Call = { name: string; value?: string; opts: Record<string, unknown> };
function fakeCookies(existing: Record<string, string> = {}) {
	const sets: Call[] = [];
	const deletes: Call[] = [];
	return {
		sets,
		deletes,
		jar: {
			set: (name: string, value: string, opts: Record<string, unknown>) =>
				sets.push({ name, value, opts }),
			delete: (name: string, opts: Record<string, unknown>) => deletes.push({ name, opts }),
			get: (name: string) => existing[name]
		} as never
	};
}

describe('auth cookies', () => {
	it('sets the refresh cookie on Path=/ so the proxy, layout and logout receive it', () => {
		const c = fakeCookies();
		setAuthCookies(c.jar, 'acc', 'ref');
		const refresh = c.sets.find((s) => s.name === 'lk_refresh');
		expect(refresh?.opts).toMatchObject({ path: '/', httpOnly: true, sameSite: 'strict' });
	});

	it('gives the csrf cookie the refresh lifetime, not the access lifetime', () => {
		const c = fakeCookies();
		setAuthCookies(c.jar, 'acc', 'ref');
		const csrf = c.sets.find((s) => s.name === 'lk_csrf');
		const refresh = c.sets.find((s) => s.name === 'lk_refresh');
		expect(csrf?.opts.maxAge).toBe(refresh?.opts.maxAge);
		expect(csrf?.opts.httpOnly).toBe(false);
	});

	it("matches Go's lifetimes: 10 min access, 14 days refresh / csrf / must-change-password", () => {
		const c = fakeCookies();
		setAuthCookies(c.jar, 'acc', 'ref');
		const maxAge = (name: string) => c.sets.find((s) => s.name === name)?.opts.maxAge;
		expect(maxAge('lk_access')).toBe(600);
		expect(maxAge('lk_refresh')).toBe(1_209_600);
		expect(maxAge('lk_csrf')).toBe(1_209_600);
		const mcp = fakeCookies();
		setMustChangePassword(mcp.jar, true);
		expect(mcp.sets.find((s) => s.name === 'lk_mcp')?.opts.maxAge).toBe(1_209_600);
	});

	it('clears the refresh cookie on both the new and the legacy path', () => {
		const c = fakeCookies();
		clearAuthCookies(c.jar);
		const paths = c.deletes.filter((d) => d.name === 'lk_refresh').map((d) => d.opts.path);
		expect(paths).toEqual(expect.arrayContaining(['/', '/auth/refresh']));
	});

	it('keeps the existing csrf value but renews its expiry when keepCsrf is set', () => {
		const c = fakeCookies({ lk_csrf: 'existing' });
		setAuthCookies(c.jar, 'acc', 'ref', { keepCsrf: true });
		const csrf = c.sets.find((s) => s.name === 'lk_csrf');
		expect(csrf?.value).toBe('existing');
		expect(csrf?.opts.maxAge).toBe(14 * 24 * 3600);
		expect(csrf?.opts.httpOnly).toBe(false);
	});

	it('still mints a csrf cookie with keepCsrf when none exists', () => {
		const c = fakeCookies();
		setAuthCookies(c.jar, 'acc', 'ref', { keepCsrf: true });
		expect(c.sets.find((s) => s.name === 'lk_csrf')).toBeDefined();
	});
});

describe('the sign-in notice cookie', () => {
	it.each(SIGNIN_NOTICES)(
		'%s: the name only, on /signin, for two minutes, httpOnly (only the server reads it)',
		(notice) => {
			const c = fakeCookies();
			setSigninNotice(c.jar, notice);
			expect(c.sets).toEqual([
				{
					name: 'lk_signin_notice',
					value: notice,
					opts: { path: '/signin', maxAge: 120, sameSite: 'lax', secure: false, httpOnly: true }
				}
			]);
		}
	);

	it('is Secure in production, like the session cookies', () => {
		prod.on = true;
		const c = fakeCookies();
		setSigninNotice(c.jar, 'session_expired');
		setAuthCookies(c.jar, 'acc', 'ref');
		const secure = (name: string) => c.sets.find((s) => s.name === name)?.opts.secure;
		expect(secure('lk_signin_notice')).toBe(true);
		expect(secure('lk_signin_notice')).toBe(secure('lk_refresh'));
	});

	it.each([
		['an unknown reason', 'idle_timeout'],
		['a hostile value', 'session_expired\r\nSet-Cookie: lk_access=x'],
		['markup', '<img src=x onerror=alert(1)>'],
		['a token', 'eyJhbGciOiJIUzI1NiJ9.e30.sig'],
		['empty', ''],
		['missing', undefined],
		['null', null],
		['an object', { reason: 'session_expired' }]
	])('%s sets nothing', (_label, value) => {
		const c = fakeCookies();
		setSigninNotice(c.jar, value);
		expect(c.sets).toEqual([]);
		expect(c.deletes).toEqual([]);
	});

	it('is cleared on its own path', () => {
		const c = fakeCookies({ lk_signin_notice: 'session_expired' });
		clearSigninNotice(c.jar);
		expect(c.deletes).toEqual([{ name: 'lk_signin_notice', opts: { path: '/signin' } }]);
	});

	it('clearing the session cookies (sign-out) sets no notice and leaves none behind to set', () => {
		const c = fakeCookies();
		clearAuthCookies(c.jar);
		expect(c.sets).toEqual([]);
		expect(c.deletes.map((d) => d.name)).not.toContain('lk_signin_notice');
	});

	const DELETED = [{ name: 'lk_signin_notice', opts: { path: '/signin' } }];

	it.each(SIGNIN_NOTICES)('take: %s is returned once and the cookie is deleted', (notice) => {
		const c = fakeCookies({ lk_signin_notice: notice });
		expect(takeSigninNotice(c.jar)).toBe(notice);
		expect(c.deletes).toEqual(DELETED);
		expect(c.sets).toEqual([]);
	});

	it.each([
		'idle_timeout',
		'Session_Expired',
		'session_expired;x',
		'<script>alert(1)</script>',
		'eyJhbGciOiJIUzI1NiJ9.e30.sig',
		''
	])('take: an unknown value (%j) names nothing and is deleted all the same', (value) => {
		const c = fakeCookies({ lk_signin_notice: value });
		expect(takeSigninNotice(c.jar)).toBeNull();
		expect(c.deletes).toEqual(DELETED);
	});

	it('take: no cookie, nothing returned and nothing written', () => {
		const c = fakeCookies({ lk_csrf: 'abc' });
		expect(takeSigninNotice(c.jar)).toBeNull();
		expect(c.deletes).toEqual([]);
		expect(c.sets).toEqual([]);
	});
});
