/** Fixtures of the material half of the contrast gate: a tiny token file and one layer over it. */
import {
	checkCss,
	parseRules,
	propertiesFor
} from '../../../scripts/arch/check-token-contrast.mjs';

export const pair = (over: object = {}) => ({ fg: 'fg', bg: 'bg', min: 4.5, label: 'p', ...over });

export const FIXED_AXES = {
	palette: ['iris'],
	sidebarColors: ['light']
};
export const base = (
	extra = '',
	fill = 72
) => `:root { --card: light-dark(#ffffff, #0f172b); --popover: var(--card);
	--bg: #ffffff; --fg: #000000;
	--text: light-dark(#0b121a, #f1f5f9); --mfg: light-dark(#454e58, #cbd5e1); --weak: #656565;
	--bar-fill: color-mix(in srgb, var(--card) ${fill}%, transparent);
	--bar-sat: 1; --bar-con: 1;
	--scrim: light-dark(color-mix(in srgb, black 35%, transparent), color-mix(in srgb, black 55%, transparent));
	${extra} }`;
export const layer = (over: object = {}) => ({
	layer: 'bar',
	fill: 'bar-fill',
	surface: 'card',
	saturate: 'bar-sat',
	contrast: 'bar-con',
	backdrops: ['#000', '#fff'],
	text: ['text'],
	marks: [] as string[],
	...over
});
export const gate = (css: string, l: object, mode = 'light', transparency = 'glass') =>
	checkCss([['f.css', css]], {
		pairs: [pair()] as never,
		axes: { ...FIXED_AXES, mode: [mode], transparency: [transparency] } as never,
		layers: [l] as never
	});
export const propsFor = (css: string, transparency: string, mode = 'light') =>
	propertiesFor(parseRules(css, 'f.css').rules, {
		palette: 'iris',
		mode,
		sidebarColors: 'light',
		transparency
	});
