import { describe, expect, it } from 'vitest';
import { configSchema, createConfigSchema } from '#lib/server/config.ts';

const base = { GO_API_URL: 'http://localhost:8080' };
const withSecret = { ...base, SCOPE_COOKIE_SECRET: 'x'.repeat(32) };
// Production also needs a way to know its public origin.
const prodOrigin = { ORIGIN: 'https://app.example.com' };
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
		expect(configSchema.safeParse({ ...prod, ORIGIN: 'https://app.example.com' }).success).toBe(
			true
		);
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
		const out = configSchema.safeParse({ ...withSecret, NODE_ENV: 'test' });
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
			UPSTREAM_TIMEOUT_MS: '11666'
		});
		expect(out.success).toBe(true);
		const edge = configSchema.safeParse({
			...withSecret,
			NODE_ENV: 'test',
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
		const headers = { PROTOCOL_HEADER: 'x-forwarded-proto', HOST_HEADER: 'x-forwarded-host' };
		expect(configSchema.safeParse({ ...prod, ...headers }).success).toBe(true);
		expect(configSchema.safeParse({ ...prod, PROTOCOL_HEADER: 'x-forwarded-proto' }).success).toBe(
			false
		);
		expect(configSchema.safeParse({ ...prod, HOST_HEADER: 'x-forwarded-host' }).success).toBe(
			false
		);
	});

	it('does not require an origin outside production', () => {
		expect(configSchema.safeParse({ ...withSecret, NODE_ENV: 'test' }).success).toBe(true);
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
			SCOPE_COOKIE_SECRET: 'e2e-only-scope-cookie-secret-0123456789abcdef'
		});
		expect(out.success).toBe(true);
	});
});
