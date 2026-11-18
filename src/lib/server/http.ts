/** Shared JSON error response for BFF route handlers: `{ error, message }`, never cached. */
export function jsonError(status: number, error: string, message: string): Response {
	return Response.json({ error, message }, { status, headers: { 'cache-control': 'no-store' } });
}
