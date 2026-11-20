/**
 * A layout that already renders the page's `PageHeader` (the tenant-context pages: the company's
 * name, the section tabs) wraps its children in `NestedPageHeaders`. A `PageHeader` rendered below it
 * (the Team list inside a tenant context) is then a section title: an `<h2>`, with no second
 * breadcrumb trail. The page keeps exactly one `<h1>`.
 */
import { getContext, setContext } from 'svelte';

const KEY = Symbol.for('lk-nested-page-header');

export function setNestedPageHeaders(): void {
	setContext(KEY, true);
}

export function inNestedPageHeaders(): boolean {
	return getContext<boolean | undefined>(KEY) === true;
}
