export const ALLOWLIST_FILE: string;
export const NOT_IMPORTERS: string[];
export function findLegacyImports(
	rel: string,
	src: string
): Array<{ line: number; list: 'drawer' | 'legacyDataTable'; what: string }>;
export function checkLegacyImports(
	allowlist: { drawer: string[]; legacyDataTable: string[]; notes?: Record<string, string> },
	files: Map<string, string>
): { violations: string[]; stale: string[] };
