import { describe, expect, it } from 'vitest';
import { clearAuthCookies, setAuthCookies, setMustChangePassword } from '#lib/server/cookies.ts';

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
