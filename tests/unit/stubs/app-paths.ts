/**
 * Vitest stub for `$app/paths`: identity `resolve`, empty base. Component tests that mount
 * routes' links need the alias to resolve; they never depend on a real base path.
 */
export const base = '';
export const assets = '';
export const resolve = (path: string): string => path;
export const asset = (path: string): string => path;
