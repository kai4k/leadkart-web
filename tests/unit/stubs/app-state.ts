/**
 * Vitest stub for `$app/state`. Individual tests override `page`
 * with `vi.mock('$app/state', () => ({ page: ... }))`; this file
 * exists solely so Vite's module-resolution layer finds something
 * at the alias.
 */
export const page: { url: URL } = { url: new URL('http://localhost/') };
