/** Response headers set on every SSR / endpoint response. CSP is configured in vite.config.ts. */
export function securityHeaders(prod: boolean): Record<string, string> {
	return {
		'x-content-type-options': 'nosniff',
		'x-frame-options': 'DENY',
		'referrer-policy': 'strict-origin-when-cross-origin',
		'permissions-policy': 'camera=(), microphone=(), geolocation=()',
		...(prod ? { 'strict-transport-security': 'max-age=63072000; includeSubDomains' } : {})
	};
}
