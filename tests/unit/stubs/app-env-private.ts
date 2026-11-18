/**
 * Vitest stub for `$app/env/private`. Gives a valid config so server
 * modules that read `config.X` at call time (cookies, auth-refresh) work
 * under test. Config tests exercise `configSchema` directly.
 */
export const GO_API_URL: string | undefined = 'http://localhost:9999';
export const NODE_ENV: string | undefined = 'test';
export const SCOPE_COOKIE_SECRET: string | undefined = 'vitest-scope-cookie-secret-0123456789';
export const ORIGIN: string | undefined = undefined;
export const UPSTREAM_TIMEOUT_MS: string | undefined = undefined;
export const PROTOCOL_HEADER: string | undefined = undefined;
export const HOST_HEADER: string | undefined = undefined;
