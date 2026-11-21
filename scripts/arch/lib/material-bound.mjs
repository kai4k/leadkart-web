/**
 * The legibility bound of a translucent material (plan section 3.1), as pure functions.
 *
 * A material paints `blur() saturate(s) contrast(c)` of whatever is behind it, then its own fill on
 * top. What can be behind is a SET of colours (the tokens a layer may scroll over, plus black and white
 * for any image). The bound:
 *
 *   1. `saturate(s)` is the feColorMatrix saturate matrix, applied to every member and clamped. Browsers
 *      have differed on the colour space (CSS filter: sRGB; SVG feColorMatrix: linearRGB), so it is done
 *      in BOTH and the two results are kept apart.
 *   2. `blur()` makes convex combinations, so every blurred pixel lies inside the per-channel envelope of
 *      the saturated set. The two corners lo = (min r, min g, min b) and hi = (max r, max g, max b) need
 *      not be real backdrops, which makes the bound conservative. Blur is linear and commutes with
 *      saturate; it never makes the extremes worse (it only dilutes thin features), which the gate ignores.
 *   3. `contrast(c)` is v' = (v - 0.5) c + 0.5 per channel, clamped. For c < 1 this compresses 0..1 into a
 *      narrower band (the luminosity compression of Apple's "adjusts the luminosity of background
 *      content"), which is what lets a translucent fill carry text.
 *   4. The material fill is painted over each corner in sRGB (the caller composites).
 *
 * Colours are `{ mode: 'rgb', r, g, b }` with sRGB-encoded channels in 0..1.
 */
import { clampRgb, converter } from 'culori';

const toRgb = converter('rgb');

export const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function toLinear(c) {
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
export function fromLinear(c) {
	return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** The feColorMatrix `saturate` matrix for a value `s` (the Filter Effects definition). */
export function saturateMatrix(s) {
	return [
		[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
		[0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
		[0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]
	];
}

/** `saturate(s)` of one colour, clamped, in the sRGB-encoded or the linearRGB space. */
export function applySaturate(color, s, space = 'srgb') {
	const c = clampRgb(toRgb(color));
	const v = [c.r, c.g, c.b].map((x) => (space === 'linear' ? toLinear(x) : x));
	const m = saturateMatrix(s);
	const out = m.map((row) => clamp01(row[0] * v[0] + row[1] * v[1] + row[2] * v[2]));
	const enc = out.map((x) => (space === 'linear' ? fromLinear(x) : x));
	return { mode: 'rgb', r: enc[0], g: enc[1], b: enc[2] };
}

/** `contrast(c)` of a channel value, clamped. */
export function contrastChannel(v, c) {
	return clamp01((v - 0.5) * c + 0.5);
}

export function applyContrast(color, c) {
	return {
		mode: 'rgb',
		r: contrastChannel(color.r, c),
		g: contrastChannel(color.g, c),
		b: contrastChannel(color.b, c)
	};
}

/**
 * The darkest and lightest colour a layer's backdrop can reach after the filter, per colour space.
 *
 * @param {object[]} backdrops colours (culori objects, or anything culori converts)
 * @param {number} saturate the `saturate()` argument
 * @param {number} contrast the `contrast()` argument
 * @returns {Array<{ space: 'srgb' | 'linear', side: 'lo' | 'hi', color: object }>} four corners
 */
export function corners(backdrops, saturate, contrast) {
	const out = [];
	for (const space of /** @type {const} */ (['srgb', 'linear'])) {
		const set = backdrops.map((b) => applySaturate(b, saturate, space));
		const lo = {
			mode: 'rgb',
			r: Math.min(...set.map((c) => c.r)),
			g: Math.min(...set.map((c) => c.g)),
			b: Math.min(...set.map((c) => c.b))
		};
		const hi = {
			mode: 'rgb',
			r: Math.max(...set.map((c) => c.r)),
			g: Math.max(...set.map((c) => c.g)),
			b: Math.max(...set.map((c) => c.b))
		};
		out.push({ space, side: 'lo', color: applyContrast(lo, contrast) });
		out.push({ space, side: 'hi', color: applyContrast(hi, contrast) });
	}
	return out;
}

/** `fg` painted at `alpha` over `bg`, in sRGB (what the browser does). */
export function paint(fg, alpha, bg) {
	const f = toRgb(fg);
	const b = toRgb(bg);
	return {
		mode: 'rgb',
		r: f.r * alpha + b.r * (1 - alpha),
		g: f.g * alpha + b.g * (1 - alpha),
		b: f.b * alpha + b.b * (1 - alpha)
	};
}
