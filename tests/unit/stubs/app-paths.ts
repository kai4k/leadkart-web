/**
 * Vitest stub for `$app/paths`. Exists solely so Vite's import-analysis
 * finds something at the alias when a feature barrel pulls in components;
 * identity resolution is enough for unit tests.
 */
export const resolve = (path: string): string => path;
export const asset = (path: string): string => path;
