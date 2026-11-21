export interface Rgb {
	mode: 'rgb';
	r: number;
	g: number;
	b: number;
}
export function saturateMatrix(s: number): number[][];
export function applySaturate(color: object, s: number, space?: 'srgb' | 'linear'): Rgb;
export function contrastChannel(v: number, c: number): number;
export function applyContrast(color: Rgb, c: number): Rgb;
export function corners(
	backdrops: object[] | string[],
	saturate: number,
	contrast: number
): Array<{ space: 'srgb' | 'linear'; side: 'lo' | 'hi'; color: Rgb }>;
export function paint(fg: object, alpha: number, bg: object): Rgb;
export function toLinear(c: number): number;
export function fromLinear(c: number): number;
export const clamp01: (v: number) => number;
