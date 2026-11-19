/**
 * Vitest stub for `$app/forms`. Components that pull in the auth barrel (form
 * components that use `enhance`) must resolve it; individual tests override it
 * with `vi.mock('$app/forms', ...)` when they exercise a form.
 */
export const enhance = (): { destroy(): void } => ({ destroy() {} });
export const applyAction = async (): Promise<void> => {};
export const deserialize = (): unknown => ({});
