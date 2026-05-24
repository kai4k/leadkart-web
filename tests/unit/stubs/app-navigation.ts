/**
 * Vitest stub for `$app/navigation`. Individual tests override these
 * with `vi.mock('$app/navigation', () => ({ ... }))`; this file exists
 * solely so Vite's module-resolution layer finds something at the
 * alias.
 */
export const goto: (...args: unknown[]) => Promise<void> = async () => {};
