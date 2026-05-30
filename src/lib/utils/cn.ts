import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * `cn` — class-name utility that merges Tailwind classes intelligently
 * (later tokens override earlier ones for the same property). Industry-
 * canonical helper since shadcn-svelte; lives at lib/utils/cn.ts in
 * every modern Svelte project.
 *
 * @example
 *   <button class={cn('px-4 py-2', isPrimary && 'bg-brand-600', class)}>
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// ─── shadcn-svelte helper types ──────────────────────────────────────
// Used by every generated shadcn-svelte component to thread a `ref`
// $bindable through to the underlying element + strip the children
// snippet from prop types when forwarding to bits-ui primitives.

export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;

export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;

export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;

// ─── SvelteKit href resolver ─────────────────────────────────────────
// Primitive atoms accept arbitrary `href` props. To stay correct under
// non-root `paths.base` deployment, internal paths (starting with `/`,
// not protocol-relative `//`) are resolved via SvelteKit's `resolve()`.
// External (`http`, `https`, scheme:), hash anchors, protocol-relative,
// and undefined are passed through unchanged.
//
// Use in any atom that renders `<a href={...}>` with a passthrough prop
// (Button, Breadcrumb, Pagination, etc.). Satisfies the
// `svelte/no-navigation-without-resolve` ESLint rule + ensures
// deployment-portability.

import { resolve } from '$app/paths';

const EXTERNAL_HREF_PATTERN = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;

/**
 * Returns true when `href` is a protocol URL (`https:`, `mailto:`, …),
 * protocol-relative `//cdn…`, or in-page hash `#section`. Used by atom
 * primitives that accept arbitrary `href` props to skip
 * SvelteKit's `resolve()` for non-internal navigation.
 */
export function isExternalHref(href: string | undefined | null): boolean {
	if (!href) return false;
	return EXTERNAL_HREF_PATTERN.test(href);
}

/**
 * Combine `isExternalHref()` + SvelteKit `resolve()` to make an arbitrary
 * string href safe for non-empty `paths.base` deployment without breaking
 * external URLs. Callers that already know the path is internal should
 * call `resolve()` directly so the typed-routes lint rule can validate.
 */
export function resolveHref(href: string | undefined | null): string | undefined {
	if (!href) return undefined;
	if (EXTERNAL_HREF_PATTERN.test(href)) return href;
	return (resolve as (path: string) => string)(href);
}
