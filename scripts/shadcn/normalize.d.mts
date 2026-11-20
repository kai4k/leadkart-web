export function iconExports(): Set<string>;
export function mergeImports(src: string): string;
export function normalizeClasses(text: string): string;
export function remainingAlpha(src: string): Array<{ line: number; utility: string }>;
export function normalizeSource(
	src: string,
	options?: { icons?: Set<string> }
): { out: string; problems: string[] };
