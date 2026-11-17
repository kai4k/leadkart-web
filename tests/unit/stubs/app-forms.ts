/**
 * Vitest stub for `$app/forms`. Exists solely so Vite's import-analysis
 * finds something at the alias when a feature barrel pulls in form
 * components; tests that exercise forms override it via `vi.mock`.
 */
export const enhance: (...args: unknown[]) => { destroy: () => void } = () => ({
	destroy: () => {}
});
