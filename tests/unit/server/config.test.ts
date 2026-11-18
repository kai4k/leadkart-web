import { describe, expect, it } from 'vitest';
import { configSchema } from '#lib/server/config.ts';

const base = { GO_API_URL: 'http://localhost:8080' };

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

	it('supplies a dev-only secret outside production', () => {
		const out = configSchema.safeParse({ ...base, NODE_ENV: 'development' });
		expect(out.success && out.data.SCOPE_COOKIE_SECRET.length).toBeGreaterThanOrEqual(32);
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
		const out = configSchema.safeParse({ ...base, NODE_ENV: 'test' });
		expect(out.success && out.data.UPSTREAM_TIMEOUT_MS).toBe(10_000);
	});
});
