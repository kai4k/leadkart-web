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

export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;

export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;

export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
