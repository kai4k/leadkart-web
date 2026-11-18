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

/**
 * SSR HTML carries a per-request CSP nonce and authenticated content: it must
 * never be stored by a shared cache. An explicit cache-control is kept.
 */
export function withHtmlNoStore(headers: Headers): Headers {
	if (headers.get('content-type')?.startsWith('text/html') && !headers.has('cache-control')) {
		headers.set('cache-control', 'private, no-store');
	}
	return headers;
}

function stamp(headers: Headers, prod: boolean): void {
	for (const [name, value] of Object.entries(securityHeaders(prod))) headers.set(name, value);
	withHtmlNoStore(headers);
}

/**
 * Set the baseline headers on a response. Responses from `Response.redirect()`
 * or `fetch()` have immutable headers (set throws TypeError); rebuild a mutable
 * copy in that case.
 */
export function applySecurityHeaders(response: Response, prod: boolean): Response {
	try {
		stamp(response.headers, prod);
		return response;
	} catch (err) {
		if (!(err instanceof TypeError)) throw err;
		const rebuilt = new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: new Headers(response.headers)
		});
		stamp(rebuilt.headers, prod);
		return rebuilt;
	}
}
