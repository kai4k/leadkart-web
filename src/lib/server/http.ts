import { isHttpError } from '@sveltejs/kit';
import { upstreamStatus } from './proxy.ts';

/** Shared JSON error response for BFF route handlers: `{ error, message }`, never cached. */
export function jsonError(status: number, error: string, message: string): Response {
	return Response.json({ error, message }, { status, headers: { 'cache-control': 'no-store' } });
}

/**
 * The JSON answer for a failed upstream call: 504 when Go was too slow, else 502 (or the 5xx status
 * of an `HttpError` a Go helper already threw). One envelope for every BFF route.
 */
export function upstreamJsonError(err: unknown): Response {
	const status = isHttpError(err) ? err.status : upstreamStatus(err);
	return status === 504
		? jsonError(504, 'upstream_timeout', 'Go API did not respond in time')
		: jsonError(status, 'upstream_unavailable', 'Go API is unreachable');
}
