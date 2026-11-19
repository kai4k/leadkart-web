/**
 * Timeout budget shared by the BFF (server) and the browser client.
 *
 * INVARIANT: the browser's read timeout must exceed what the BFF proxy can
 * spend on ONE browser request. The proxy may make up to three sequential
 * upstream hops (attempt -> token refresh -> retry), each bounded by
 * `UPSTREAM_TIMEOUT_MS`. If the browser aborts mid-refresh the BFF still
 * rotates the refresh token at Go but the Set-Cookie never reaches the
 * browser; the stale token is replayed later and Go's reuse detection ends
 * the session. So: client read timeout > BFF_MAX_UPSTREAM_HOPS x upstream
 * timeout. Mutations get no client timeout (the BFF bounds them), so a
 * committed write is never reported as "timed out".
 */
export const DEFAULT_UPSTREAM_TIMEOUT_MS = 10_000;
/** attempt -> refresh -> retry. */
export const BFF_MAX_UPSTREAM_HOPS = 3;
const TIMEOUT_MARGIN_MS = 5_000;
/** Default client timeout for reads (GET). */
export const DEFAULT_READ_TIMEOUT_MS =
	BFF_MAX_UPSTREAM_HOPS * DEFAULT_UPSTREAM_TIMEOUT_MS + TIMEOUT_MARGIN_MS;
