import { z } from 'zod';

/**
 * The eight customiser axes, one list per axis. This is the only place that knows the legal
 * values: the cookie decoder, the store, the `<html data-*>` writer and the customiser UI all read
 * it, so nothing that reaches the document can be anything but a member of these lists.
 */
export const PREFERENCE_VALUES = {
	layout: ['vertical', 'horizontal', 'modern', 'boxed', 'semibox'],
	navType: ['default', 'floating', 'boxed', 'pattern'],
	contentWidth: ['default', 'fluid'],
	sidebar: ['large', 'medium', 'small'],
	mode: ['light', 'dark', 'auto', 'black-white'],
	colors: ['leadkart', 'green', 'violet', 'orange', 'teal', 'fuchsia', 'lime', 'amber'],
	sidebarColors: ['light', 'dark', 'brand', 'purple', 'sky'],
	darkPalette: ['default', 'zinc', 'stone', 'neutral', 'gray']
} as const;

export type PreferenceKey = keyof typeof PREFERENCE_VALUES;
export type Preferences = { [K in PreferenceKey]: (typeof PREFERENCE_VALUES)[K][number] };

export const PREFERENCE_KEYS = Object.keys(PREFERENCE_VALUES) as PreferenceKey[];

export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({
	layout: 'vertical',
	navType: 'default',
	contentWidth: 'default',
	sidebar: 'large',
	mode: 'light',
	colors: 'leadkart',
	sidebarColors: 'light',
	darkPalette: 'default'
});

/** The `<html>` attribute each axis is written to. CSS selects on these. */
export const PREFERENCE_ATTRIBUTES: Readonly<Record<PreferenceKey, string>> = Object.freeze({
	layout: 'data-layout',
	navType: 'data-nav-type',
	contentWidth: 'data-content-width',
	sidebar: 'data-sidebar',
	mode: 'data-mode',
	colors: 'data-colors',
	sidebarColors: 'data-sidebar-colors',
	darkPalette: 'data-dark-palette'
});

/** Is `value` a legal value for `key`? The one membership test the store and the codec share. */
export function isPreferenceValue<K extends PreferenceKey>(
	key: K,
	value: unknown
): value is Preferences[K] {
	return (PREFERENCE_VALUES[key] as readonly unknown[]).includes(value);
}

function axis<K extends PreferenceKey>(key: K) {
	return z
		.enum(PREFERENCE_VALUES[key] as readonly [string, ...string[]])
		.catch(DEFAULT_PREFERENCES[key]);
}

/** Every field falls back to its default on its own; a non-object falls back to all defaults. */
export const preferencesSchema = z
	.object({
		layout: axis('layout'),
		navType: axis('navType'),
		contentWidth: axis('contentWidth'),
		sidebar: axis('sidebar'),
		mode: axis('mode'),
		colors: axis('colors'),
		sidebarColors: axis('sidebarColors'),
		darkPalette: axis('darkPalette')
	})
	.catch({ ...DEFAULT_PREFERENCES }) as unknown as z.ZodType<Preferences>;
