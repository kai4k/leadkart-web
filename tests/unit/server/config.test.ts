import { describe, expect, it } from 'vitest';
import { configSchema, createConfigSchema } from '#lib/server/config.ts';

const base = { GO_API_URL: 'http://localhost:8080' };
const withSecret = { ...base, SCOPE_COOKIE_SECRET: 'x'.repeat(32) };

describe('configSchema', () => {
	it('defaults NODE_ENV to production (fail closed)', () => {
		const out = configSchema.safeParse({ ...base, SCOPE_COOKIE_SECRET: 'x'.repeat(32) });
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
		const out = configSchema.safeParse({ ...withSecret, UPSTREAM_TIMEOUT_MS: '' });
		expect(out.success && out.data.UPSTREAM_TIMEOUT_MS).toBe(10_000);
	});

	it('treats an empty ORIGIN as unset in production', () => {
		const out = configSchema.safeParse({ ...withSecret, NODE_ENV: 'production', ORIGIN: '' });
		expect(out.success).toBe(true);
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
});
