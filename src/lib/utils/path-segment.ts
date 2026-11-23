/**
 * One value as ONE segment of an API path: `/v1/users/${seg(id)}`.
 *
 * An id comes from the page URL (`/leads/..%2F..%2Fusers` gives `params.id = "../../users"`). Written into a path as
 * it is, the browser resolves the dots before the request leaves, and the call lands on ANOTHER API path
 * (`/api/v1/users`), which the BFF forwards because it only ever sees the clean path. Encoded, the slash, `?` and `#`
 * are data and the value stays inside its segment.
 *
 * `.` and `..` have no encoded form a URL parser leaves alone (`%2E%2E` is resolved too) and are never an id: refused.
 */
export function seg(value: string): string {
	const encoded = encodeURIComponent(value);
	if (encoded === '.' || encoded === '..') {
		throw new TypeError('seg: not a path segment');
	}
	return encoded;
}
