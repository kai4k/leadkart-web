export const ALLOWED_DIR: string;
export const EXEMPT_FILES: Record<string, string>;
export function findViolations(
	rel: string,
	src: string
): Array<{ line: number; specifier: string }>;
