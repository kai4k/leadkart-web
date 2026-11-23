import { describe, expect, it } from 'vitest';
import { configSchema, createConfigSchema } from '#lib/server/config.ts';

const base = { GO_API_URL: 'http://localhost:8080' };
// NODE_ENV=test is refused without a localhost ORIGIN.
const local = { ORIGIN: 'http://localhost:4173' };
const withSecret = { ...base, SCOPE_COOKIE_SECRET: 'x'.repeat(32) };
// Production also needs a way to know its public origin.
const prodOrigin = {
	ORIGIN: 'https://app.example.com',
	PUBLIC_SITE_URL: 'https://app.example.com'
};
const issuesOf = (r: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
	r.success ? [] : (r.error?.issues.map((i) => i.message) ?? []);

describe('configSchema', () => {
	it('defaults NODE_ENV to production (fail closed)', () => {
		const out = configSchema.safeParse({ ...withSecret, ...prodOrigin });
		expect(out.success && out.data.NODE_ENV).toBe('production');
	});

	it('requires a 32+ char SCOPE_COOKIE_SECRET in production', () => {
		expect(configSchema.safeParse({ ...base, NODE_ENV: 'production' }).success).toBe(false);
		expect(
			configSchema.safeParse({ ...base, NODE_ENV: 'production', SCOPE_COOKIE_SECRET: 'short' })
				.success
		).toBe(false);
	});

	it('supplies a dev-only secret only when allowDevSecret is set', () => {
		const out = createConfigSchema({ allowDevSecret: true }).safeParse({
			...base,
			NODE_ENV: 'development'
		});
		expect(out.success && out.data.SCOPE_COOKIE_SECRET.length).toBeGreaterThanOrEqual(32);
	});

	it('requires a secret outside production when allowDevSecret is false', () => {
		const out = configSchema.safeParse({ ...base, NODE_ENV: 'test' });
		expect(out.success).toBe(false);
		expect(!out.success && out.error.issues[0]?.path).toEqual(['SCOPE_COOKIE_SECRET']);
	});

	it('treats an empty SCOPE_COOKIE_SECRET as unset', () => {
		const out = createConfigSchema({ allowDevSecret: true }).safeParse({
			...base,
			NODE_ENV: 'development',
			SCOPE_COOKIE_SECRET: ''
		});
		expect(out.success && out.data.SCOPE_COOKIE_SECRET).toBe(
			'dev-only-scope-cookie-secret-not-for-production'
		);
	});

	it('treats an empty UPSTREAM_TIMEOUT_MS as unset', () => {
		const out = configSchema.safeParse({ ...withSecret, ...prodOrigin, UPSTREAM_TIMEOUT_MS: '' });
		expect(out.success && out.data.UPSTREAM_TIMEOUT_MS).toBe(10_000);
	});

	it('treats an empty ORIGIN as unset in production', () => {
		const out = configSchema.safeParse({ ...withSecret, NODE_ENV: 'production', ORIGIN: '' });
		expect(out.success).toBe(false);
		expect(issuesOf(out).join()).toMatch(/ORIGIN or both PROTOCOL_HEADER and HOST_HEADER/);
	});

	it('requires ORIGIN to be a bare origin', () => {
		const prod = { ...withSecret, NODE_ENV: 'production' };
		expect(
			configSchema.safeParse({ ...prod, ORIGIN: 'https://app.example.com/path' }).success
		).toBe(false);
		expect(
			configSchema.safeParse({
				...prod,
				ORIGIN: 'https://app.example.com',
				PUBLIC_SITE_URL: 'https://app.example.com'
			}).success
		).toBe(true);
	});

	it('rejects a non-https ORIGIN in production', () => {
		const out = configSchema.safeParse({
			...base,
			NODE_ENV: 'production',
			SCOPE_COOKIE_SECRET: 'x'.repeat(32),
			ORIGIN: 'http://app.example.com'
		});
		expect(out.success).toBe(false);
	});

	it('defaults the upstream timeout to 10 s', () => {
		const out = configSchema.safeParse({ ...withSecret, NODE_ENV: 'test', ...local });
		expect(out.success && out.data.UPSTREAM_TIMEOUT_MS).toBe(10_000);
	});

	it('fails boot when hops x upstream timeout reaches the client read timeout (any NODE_ENV)', () => {
		// 3 hops x 15 s = 45 s >= the 35 s client read timeout.
		for (const NODE_ENV of ['test', 'development']) {
			const out = configSchema.safeParse({ ...withSecret, NODE_ENV, UPSTREAM_TIMEOUT_MS: '15000' });
			expect(out.success).toBe(false);
			const msg = issuesOf(out).join();
			expect(msg).toMatch(/UPSTREAM_TIMEOUT_MS/);
			expect(msg).toContain('45000');
			expect(msg).toContain('35000');
		}
	});

	it('accepts the largest timeout that still fits under the client read timeout', () => {
		const out = configSchema.safeParse({
			...withSecret,
			NODE_ENV: 'test',
			...local,
			UPSTREAM_TIMEOUT_MS: '11666'
		});
		expect(out.success).toBe(true);
		const edge = configSchema.safeParse({
			...withSecret,
			NODE_ENV: 'test',
			...local,
			UPSTREAM_TIMEOUT_MS: '11667'
		});
		expect(edge.success).toBe(false);
	});
});

describe('configSchema: production origin', () => {
	const prod = { ...withSecret, NODE_ENV: 'production' };

	it('fails with a clear message when neither ORIGIN nor the proxy headers are set', () => {
		const out = configSchema.safeParse(prod);
		expect(out.success).toBe(false);
		expect(issuesOf(out).join()).toMatch(/ORIGIN or both PROTOCOL_HEADER and HOST_HEADER/);
	});

	it('accepts ORIGIN alone', () => {
		expect(configSchema.safeParse({ ...prod, ...prodOrigin }).success).toBe(true);
	});

	it('accepts PROTOCOL_HEADER + HOST_HEADER together, not one of them', () => {
		const headers = {
			PROTOCOL_HEADER: 'x-forwarded-proto',
			HOST_HEADER: 'x-forwarded-host',
			PUBLIC_SITE_URL: 'https://app.example.com'
		};
		expect(configSchema.safeParse({ ...prod, ...headers }).success).toBe(true);
		expect(configSchema.safeParse({ ...prod, PROTOCOL_HEADER: 'x-forwarded-proto' }).success).toBe(
			false
		);
		expect(configSchema.safeParse({ ...prod, HOST_HEADER: 'x-forwarded-host' }).success).toBe(
			false
		);
	});

	it('does not require an origin outside production', () => {
		expect(configSchema.safeParse({ ...withSecret, NODE_ENV: 'test', ...local }).success).toBe(
			true
		);
	});
});

describe('configSchema: no test or dev secret in production', () => {
	const prod = { ...base, ...prodOrigin, NODE_ENV: 'production' };

	it('rejects the e2e-only secret family in production', () => {
		const out = configSchema.safeParse({
			...prod,
			SCOPE_COOKIE_SECRET: 'e2e-only-scope-cookie-secret-0123456789abcdef'
		});
		expect(out.success).toBe(false);
		expect(issuesOf(out).join()).toMatch(/test\/dev secret/);
	});

	it('rejects the public dev secret in production', () => {
		const out = configSchema.safeParse({
			...prod,
			SCOPE_COOKIE_SECRET: 'dev-only-scope-cookie-secret-not-for-production'
		});
		expect(out.success).toBe(false);
	});

	it('still lets the e2e build (NODE_ENV=test) use the e2e secret', () => {
		const out = configSchema.safeParse({
			...base,
			NODE_ENV: 'test',
			...local,
			SCOPE_COOKIE_SECRET: 'e2e-only-scope-cookie-secret-0123456789abcdef'
		});
		expect(out.success).toBe(true);
	});
});

describe('configSchema: PUBLIC_SITE_URL (the link-preview origin written into src/app.html)', () => {
	const dev = { ...withSecret, NODE_ENV: 'development' };
	const prod = { ...withSecret, NODE_ENV: 'production', ORIGIN: 'https://app.example.com' };
	const ok = (env: Record<string, unknown>) => configSchema.safeParse(env).success;

	it('is REQUIRED in production, with the same clear error style as GO_API_URL', () => {
		for (const value of [undefined, '']) {
			const out = configSchema.safeParse({ ...prod, PUBLIC_SITE_URL: value });
			expect(out.success).toBe(false);
			expect(!out.success && out.error.issues.map((i) => i.path.join('.'))).toContain(
				'PUBLIC_SITE_URL'
			);
			expect(issuesOf(out).join()).toMatch(
				/PUBLIC_SITE_URL is required in production \(a bare https origin, e\.g\. https:\/\/app\.example\.com\)/
			);
		}
	});

	it('may be empty or unset outside production', () => {
		for (const NODE_ENV of ['development', 'test']) {
			expect(ok({ ...dev, ...local, NODE_ENV })).toBe(true);
			expect(ok({ ...dev, ...local, NODE_ENV, PUBLIC_SITE_URL: '' })).toBe(true);
		}
	});

	it('accepts exactly a bare origin', () => {
		expect(ok({ ...prod, PUBLIC_SITE_URL: 'https://app.example.com' })).toBe(true);
		expect(ok({ ...prod, PUBLIC_SITE_URL: 'https://app.example.com:8443' })).toBe(true);
		expect(ok({ ...dev, PUBLIC_SITE_URL: 'https://app.example.com' })).toBe(true);
	});

	it.each([
		['a trailing slash', 'https://app.example.com/'],
		['a path', 'https://app.example.com/app'],
		['a query', 'https://app.example.com?x=1'],
		['a fragment', 'https://app.example.com#top'],
		['credentials', 'https://user:pw@app.example.com'],
		['no scheme', 'app.example.com'],
		['a relative path', '/og'],
		['a different scheme', 'ftp://app.example.com'],
		['whitespace', ' https://app.example.com'],
		['an upper-case host that does not round-trip', 'https://APP.example.com']
	])('refuses %s, in production and outside it', (_name, value) => {
		const out = configSchema.safeParse({ ...dev, PUBLIC_SITE_URL: value });
		expect(out.success).toBe(false);
		expect(issuesOf(out).join()).toMatch(/PUBLIC_SITE_URL must be/);
		expect(ok({ ...prod, PUBLIC_SITE_URL: value })).toBe(false);
	});

	it('allows http only when NODE_ENV is not production', () => {
		expect(ok({ ...dev, PUBLIC_SITE_URL: 'http://localhost:4173' })).toBe(true);
		expect(
			ok({ ...withSecret, ...local, NODE_ENV: 'test', PUBLIC_SITE_URL: 'http://localhost:4173' })
		).toBe(true);
		const out = configSchema.safeParse({ ...prod, PUBLIC_SITE_URL: 'http://app.example.com' });
		expect(out.success).toBe(false);
		expect(issuesOf(out).join()).toMatch(/PUBLIC_SITE_URL must be https in production/);
	});
});

describe('NODE_ENV=test needs a localhost ORIGIN (a deployment cannot boot with production checks off)', () => {
	const test = { ...withSecret, NODE_ENV: 'test' };
	const ok = (v: Record<string, unknown>) => configSchema.safeParse(v).success;

	it.each([
		'http://localhost:4173',
		'https://localhost',
		'http://127.0.0.1:4173',
		'http://[::1]:4173'
	])('accepts %s', (ORIGIN) => {
		expect(ok({ ...test, ORIGIN })).toBe(true);
	});

	it.each([
		['no ORIGIN', undefined],
		['an empty ORIGIN', ''],
		['an https public origin', 'https://app.example.com'],
		['a name that only starts like localhost', 'http://localhost.example.com'],
		['a name that only ends like localhost', 'http://evil-localhost'],
		['a host with localhost as its userinfo', 'http://localhost@app.example.com']
	])('refuses %s', (_name, ORIGIN) => {
		const out = configSchema.safeParse({ ...test, ...(ORIGIN === undefined ? {} : { ORIGIN }) });
		expect(out.success).toBe(false);
		expect(issuesOf(out).join(' ')).toMatch(/NODE_ENV=test .*localhost/);
	});

	it('does not touch development or production', () => {
		expect(ok({ ...withSecret, NODE_ENV: 'development' })).toBe(true);
		expect(ok({ ...withSecret, ...prodOrigin, NODE_ENV: 'production' })).toBe(true);
	});
});
