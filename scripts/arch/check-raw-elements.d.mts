export const ALLOWLIST_FILE: string;
export const SCAN_GLOBS: string[];
export function findRawElements(rel: string, src: string): Array<{ line: number; element: string }>;
export function checkRawElements(
	allowlist: { rawElements: string[] },
	files: Map<string, string>
): { violations: string[]; stale: string[] };
