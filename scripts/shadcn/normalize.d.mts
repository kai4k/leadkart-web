export function iconExports(): Set<string>;
export function mergeImports(src: string): string;
export function normalizeClasses(text: string, options?: { z?: string; custom?: unknown }): string;
export function normalizeClassStrings(src: string, options?: { z?: string }): string;
export function zLayerFor(file?: string): string;
export function remainingAlpha(src: string): Array<{ line: number; utility: string }>;
export function normalizeSource(
	src: string,
	options?: { icons?: Set<string>; file?: string }
): { out: string; problems: string[]; reapplied: boolean };
export function customFor(file?: string): unknown;
export function handWrittenRoot(file?: string): 'dialog' | 'sheet' | undefined;
