/**
 * The customizer's groups, derived from the preference schema: every key of `PREFERENCE_VALUES` is
 * one group and every legal value is one option, so a new axis or value cannot be forgotten and the
 * UI cannot offer anything the cookie decoder, the store and the contrast gate do not know.
 *
 * Titles and labels are i18n keys (`customizer.<key>.title`, `customizer.<key>.<value>`).
 */
import { PREFERENCE_VALUES, type PreferenceKey, type Preferences } from '$features/preferences';

/** `wireframe`: a miniature of the layout; `swatch`: a colour dot. */
export type TileKind = 'wireframe' | 'swatch';

interface CustomizerOption<K extends PreferenceKey = PreferenceKey> {
	value: Preferences[K];
	labelKey: string;
	/** hidden below this breakpoint (the layout needs room to be chosen) */
	hideBelow?: 'lg';
}

export interface CustomizerGroup<K extends PreferenceKey = PreferenceKey> {
	key: K;
	titleKey: string;
	/** one line under the title; absent when the title says it all */
	hintKey?: string;
	kind: TileKind;
	options: ReadonlyArray<CustomizerOption<K>>;
	visible?: (p: Preferences) => boolean;
}

const KIND: Record<PreferenceKey, TileKind> = {
	layout: 'wireframe',
	navType: 'wireframe',
	contentWidth: 'wireframe',
	sidebar: 'wireframe',
	mode: 'wireframe',
	transparency: 'wireframe',
	darkPalette: 'swatch',
	sidebarColors: 'swatch',
	colors: 'swatch'
};

/** Domiex order, minus direction (the app is LTR, plan D5). */
const ORDER: readonly PreferenceKey[] = [
	'layout',
	'navType',
	'contentWidth',
	'sidebar',
	'mode',
	'transparency',
	'darkPalette',
	'sidebarColors',
	'colors'
];

/** Per L25: what is irrelevant in the current state is not offered. */
const VISIBLE: Partial<Record<PreferenceKey, (p: Preferences) => boolean>> = {
	navType: (p) => p.layout !== 'horizontal',
	sidebar: (p) => p.layout !== 'horizontal',
	sidebarColors: (p) => p.layout !== 'horizontal',
	darkPalette: (p) => p.mode === 'dark' || p.mode === 'auto'
};

/** The sidebar group says where Ctrl/Cmd+B works; the dark palette group says when it applies; the transparency group says what the page cannot read. */
const HINT: Partial<Record<PreferenceKey, string>> = {
	sidebar: 'customizer.sidebar.hint',
	transparency: 'customizer.transparency.hint',
	darkPalette: 'customizer.darkPalette.hint'
};

/** Layout tiles that need room (their sidebar sits beside the page) are hidden below `lg`. */
const HIDE_BELOW: Partial<Record<PreferenceKey, readonly string[]>> = {
	layout: ['modern', 'semibox']
};

/**
 * The option the page actually renders for a saved value below `lg`: the layouts that need room
 * (modern, semibox) fall back to the vertical shell there. The saved preference is not touched.
 */
export function effectiveValue(key: PreferenceKey, saved: string, narrow: boolean): string {
	if (narrow && HIDE_BELOW[key]?.includes(saved)) return 'vertical';
	return saved;
}

function groupFor(key: PreferenceKey): CustomizerGroup {
	const hidden = HIDE_BELOW[key] ?? [];
	const values: readonly string[] = PREFERENCE_VALUES[key];
	return {
		key,
		titleKey: `customizer.${key}.title`,
		hintKey: HINT[key],
		kind: KIND[key],
		options: values.map((value) => ({
			value,
			labelKey: `customizer.${key}.${value}`,
			...(hidden.includes(value) ? { hideBelow: 'lg' as const } : {})
		})) as CustomizerGroup['options'], // the value is one of PREFERENCE_VALUES[key] by construction
		visible: VISIBLE[key]
	};
}

export const CUSTOMIZER_GROUPS: ReadonlyArray<CustomizerGroup> = ORDER.map(groupFor);

export function visibleGroups(p: Preferences): CustomizerGroup[] {
	return CUSTOMIZER_GROUPS.filter((g) => !g.visible || g.visible(p));
}
