/**
 * One shape for "this enum value is shown as a badge": a label and a Badge variant.
 * Pure leaf. Each enum defines its map once, typed against the generated contract type,
 * so a missing or extra value is a compile error.
 */
type StatusVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

export interface StatusView {
	label: string;
	variant: StatusVariant;
}

/**
 * Builds the lookup for one enum. The returned function accepts only the enum's own values
 * (an unknown value at a call site is a compile error). A value Go adds later still renders:
 * the raw value in a neutral badge; a null or empty one renders an em dash.
 */
export function defineStatusMap<K extends string>(
	map: Record<K, StatusView>
): (value: K) => StatusView {
	return (value) =>
		Object.hasOwn(map, value)
			? map[value]
			: { label: value ? String(value) : '—', variant: 'neutral' };
}
