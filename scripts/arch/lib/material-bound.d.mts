export interface Rgb {
	mode: 'rgb';
	r: number;
	g: number;
	b: number;
}
export function saturateMatrix(s: number): number[][];
export function applySaturate(color: object, s: number): Rgb;
export function contrastChannel(v: number, c: number): number;
export function applyContrast(color: Rgb, c: number): Rgb;
export function corners(
	backdrops: object[] | string[],
	saturate: number,
	contrast: number
): Array<{ side: 'lo' | 'hi'; color: Rgb }>;
export function paint(fg: object, alpha: number, bg: object): Rgb;
export const clamp01: (v: number) => number;
