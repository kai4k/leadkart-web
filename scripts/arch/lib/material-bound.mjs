/**
 * The legibility bound of a translucent material (plan section 3.1), as pure functions.
 *
 * A material paints `blur() saturate(s) contrast(c)` of whatever is behind it, then its own fill on
 * top. What can be behind is a SET of colours (the tokens a layer may scroll over, plus black and white
 * for any image). The bound:
 *
 *   1. `saturate(s)` is the feColorMatrix saturate matrix, applied to every member and clamped.
 *      COLOUR SPACE: sRGB only. CSS filter functions (`blur()`, `saturate()`, `contrast()` in
 *      `filter` / `backdrop-filter`) are defined by the Filter Effects Module Level 1 as the
 *      corresponding SVG filter primitives operating in the sRGB colour space: the shorthand
 *      functions are specified with `color-interpolation-filters: sRGB`, and the property does not
 *      apply to them (https://drafts.fxtf.org/filter-effects/#supported-filter-functions). So there is
 *      no linearRGB variant to model (decision GD19). The one thing the specification does not fix is
 *      whether every engine honours that to the last digit: G12 carries a device check (compare one bar
 *      screenshot against the gate's predicted corner colours on Chrome, Safari and Firefox).
 *   2. `blur()` makes convex combinations, so every blurred pixel lies inside the per-channel envelope of
 *      the saturated set. The two corners lo = (min r, min g, min b) and hi = (max r, max g, max b) need
 *      not be real backdrops, which makes the bound conservative. Blur is linear and commutes with
 *      saturate; it never makes the extremes worse (it only dilutes thin features), which the gate ignores.
 *   3. `contrast(c)` is v' = (v - 0.5) c + 0.5 per channel, clamped. For c < 1 this compresses 0..1 into a
 *      narrower band (the luminosity compression of Apple's "adjusts the luminosity of background
 *      content"), which is what lets a translucent fill carry text. The order is the CSS order of the
 *      filter list: blur, saturate, then contrast (the two do not commute once values clamp).
 *   4. The material fill is painted over each corner in sRGB (the caller composites).
 *
 * Colours are `{ mode: 'rgb', r, g, b }` with sRGB-encoded channels in 0..1.
 */
import { clampRgb, converter } from 'culori';

const toRgb = converter('rgb');

export const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** The feColorMatrix `saturate` matrix for a value `s` (the Filter Effects definition). */
export function saturateMatrix(s) {
	return [
		[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
		[0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
		[0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]
	];
}

/** `saturate(s)` of one colour, clamped, on sRGB-encoded channels (CSS filter functions work in sRGB). */
export function applySaturate(color, s) {
	const c = clampRgb(toRgb(color));
	const m = saturateMatrix(s);
	const out = m.map((row) => clamp01(row[0] * c.r + row[1] * c.g + row[2] * c.b));
	return { mode: 'rgb', r: out[0], g: out[1], b: out[2] };
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
 * The darkest and lightest colour a layer's backdrop can reach after the filter (saturate, THEN contrast).
 *
 * @param {object[]} backdrops colours (culori objects, or anything culori converts)
 * @param {number} saturate the `saturate()` argument
 * @param {number} contrast the `contrast()` argument
 * @returns {Array<{ side: 'lo' | 'hi', color: object }>} the two corners
 */
export function corners(backdrops, saturate, contrast) {
	const set = backdrops.map((b) => applySaturate(b, saturate));
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
	return [
		{ side: 'lo', color: applyContrast(lo, contrast) },
		{ side: 'hi', color: applyContrast(hi, contrast) }
	];
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
