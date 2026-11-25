import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The material utilities (styles/utilities.css: the glass bar and large glass, milk and sidebar ones, and the solid sheet, clay,
 * clay-sm, pebble, tray and trough) are ONE class group: a component can carry only one of
 * them, and it conflicts with background-COLOUR utilities (a material IS the fill), in both directions; background
 * IMAGE utilities (gradients, `bg-none`, `bg-[url()]`) and the other `bg-*` properties are not in conflict. Without this a
 * later `bg-card` would silently sit next to `material-milk` and the cascade would pick one by source order.
 */
const twMerge = extendTailwindMerge<'material'>({
	extend: {
		classGroups: {
			material: [
				{
					material: [
						'bar',
						'glass',
						'milk',
						'sidebar',
						'sidebar-bar',
						'sheet',
						'clay',
						'clay-sm',
						'pebble',
						'tray',
						'trough'
					]
				}
			],
			// the legacy `bg-gradient-to-*` names are background IMAGES; tailwind-merge would take them for a colour
			'bg-image': [{ bg: [{ 'gradient-to': ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'] }] }]
		},
		conflictingClassGroups: { material: ['bg-color'], 'bg-color': ['material'] }
	}
});

/**
 * `cn` — class-name utility that merges Tailwind classes intelligently
 * (later tokens override earlier ones for the same property). Industry-
 * canonical helper since shadcn-svelte; lives at lib/utils/cn.ts in
 * every modern Svelte project.
 *
 * @example
 *   <button class={cn('px-4 py-2', isPrimary && 'bg-primary', class)}>
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};

export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;

export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
