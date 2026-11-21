export interface Pair {
	fg: string;
	bg: string;
	min: number;
	label: string;
	alpha?: number;
	alphaOn?: 'fg' | 'bg';
	over?: string;
	legacy?: boolean;
	scope?: { selector: string; attrs: Record<string, string> };
}
export interface Axes {
	colors: string[];
	mode: string[];
	darkPalette: string[];
	sidebarColors: string[];
	transparency?: string[];
}
export interface Rule {
	conditions: Record<string, string>;
	decls: Array<[string, string]>;
	order: number;
	scope?: string;
}
export interface CheckResult {
	problems: string[];
	combinations: number;
	checked: number;
	pairs: number;
	materialChecks?: number;
}
export const AXES: Axes & { transparency: string[] };
export const PAIRS: Pair[];
export function parseRules(
	css: string,
	file: string,
	options?: { lenient?: boolean }
): { rules: Rule[]; errors: string[] };
export function propertiesFor(
	rules: Rule[],
	combo: Record<string, string>,
	scope?: { selector: string; attrs: Record<string, string> }
): Map<string, string>;
export function composite(
	fg: object,
	alpha: number,
	bg: object
): { mode: 'rgb'; r: number; g: number; b: number };
export function pairRatio(pair: Pair, props: Map<string, string>, mode: string): number;
export function checkCss(
	files: Array<[string, string]>,
	options?: { pairs?: Pair[]; axes?: Axes; layers?: MaterialLayer[] }
): CheckResult;
export function check(): CheckResult;
export function themeFiles(root?: string): string[];
export const PATTERN_TOPBAR: { selector: string; attrs: Record<string, string> };
export const UNGATED_THEME_FILES: string[];
export interface MaterialLayer {
	layer: string;
	fill: string;
	surface: string;
	saturate: string;
	contrast: string;
	backdrops: string[];
	under?: string;
	text: string[];
	marks: string[];
	onControl?: Array<{ control: string; text: string[]; min?: number }>;
}
export const MATERIAL_LAYERS: MaterialLayer[];
export function layerCorners(
	props: Map<string, string>,
	mode: string,
	layer: MaterialLayer
): Array<{ side: 'lo' | 'hi'; color: { mode: 'rgb'; r: number; g: number; b: number } }>;
export function checkMaterials(
	props: Map<string, string>,
	mode: string,
	label: string,
	transparency: string,
	layers?: MaterialLayer[]
): {
	problems: string[];
	results: Array<{
		layer: string;
		kind: string;
		token: string;
		on: string;
		corner: string;
		ratio: number;
		min: number;
	}>;
};
export function minAlpha(
	props: Map<string, string>,
	mode: string,
	layer: MaterialLayer,
	token: string,
	min?: number
): number | null;
export function needsReport(): string;
