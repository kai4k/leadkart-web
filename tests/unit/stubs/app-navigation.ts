/**
 * Vitest stub for `$app/navigation`. Individual tests override these
 * with `vi.mock('$app/navigation', () => ({ ... }))`; this file exists
 * solely so Vite's module-resolution layer finds something at the
 * alias.
 */
export const goto: (...args: unknown[]) => Promise<void> = async () => {};
export const invalidate: (...args: unknown[]) => Promise<void> = async () => {};
/** A leave guard asks for the hook on mount; the stub never navigates, so it never calls back. */
export const beforeNavigate: (callback: (navigation: unknown) => void) => void = () => {};
