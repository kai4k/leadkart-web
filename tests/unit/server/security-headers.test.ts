import { describe, expect, it } from 'vitest';
import { securityHeaders } from '#lib/server/security-headers.ts';

describe('securityHeaders', () => {
	it('always sets the baseline headers', () => {
		expect(securityHeaders(false)).toMatchObject({
			'x-content-type-options': 'nosniff',
			'x-frame-options': 'DENY',
			'referrer-policy': 'strict-origin-when-cross-origin',
			'permissions-policy': 'camera=(), microphone=(), geolocation=()'
		});
	});
	it('adds HSTS only in production', () => {
		expect(securityHeaders(false)['strict-transport-security']).toBeUndefined();
		expect(securityHeaders(true)['strict-transport-security']).toBe(
			'max-age=63072000; includeSubDomains'
		);
	});
});
