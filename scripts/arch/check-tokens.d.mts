export const UI_DIR: string;
export const ALLOWED_ALPHA: Set<string>;
export const PENDING_REGENERATION: Set<string>;
export const COLOR_SCHEME_FILE: string;
export function colourNames(tokensCss: string): Set<string>;
export function findAlphaModifiers(
	rel: string,
	src: string,
	names: Set<string>
): Array<{ line: number; utility: string }>;
export function findColorScheme(rel: string, src: string): Array<{ line: number }>;
export const LEGACY_PALETTE_FILE: string;
export const GENERATED_UI_FILES: string[];
export function findLegacyTokens(rel: string, src: string): Array<{ line: number; name: string }>;
export function findPaletteUtilities(
	rel: string,
	src: string
): Array<{ line: number; utility: string }>;
