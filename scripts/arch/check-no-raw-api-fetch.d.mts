export const ALLOWED_FILES: Record<string, string>;
export function findViolations(rel: string, src: string): Array<{ line: number; what: string }>;
export function isAllowed(rel: string): boolean;
export const URL_ONLY_FILES: Record<string, { urls: string[]; reason: string }>;
