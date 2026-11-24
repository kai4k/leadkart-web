export const ALLOWLIST_FILE: string;
export const SCAN_GLOBS: string[];
export const PENDING_AREAS: RegExp[];
export function checkAllowlistAreas(allowlist: {
	rawElements?: string[];
	drawer?: string[];
	legacyDataTable?: string[];
}): string[];
export function findRawElements(rel: string, src: string): Array<{ line: number; element: string }>;
export function checkRawElements(
	allowlist: { rawElements: string[] },
	files: Map<string, string>
): { violations: string[]; stale: string[] };
