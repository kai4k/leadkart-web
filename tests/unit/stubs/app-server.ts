/**
 * Vitest stub for `$app/server`: no request context unless a test mocks it with `vi.mock`.
 */
export const getRequestEvent = (): never => {
	throw new Error('getRequestEvent: not inside a request');
};
