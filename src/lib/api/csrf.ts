/**
 * Reads the non-httpOnly lk_csrf cookie so callers can echo it as the
 * X-CSRF-Token header on mutating requests (double-submit-cookie pattern).
 *
 * Returns '' during SSR so the cookie shape is forgiving — server-side
 * BFF endpoints don't validate CSRF on their own POSTs anyway.
 */
export function getCsrfToken(): string {
	if (typeof document === 'undefined') return '';
	const match = document.cookie.match(/(?:^|; )lk_csrf=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : '';
}
