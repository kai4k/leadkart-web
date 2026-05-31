/**
 * `useUrlTab` — URL-synced tab state for detail pages.
 *
 * Linear / Notion canon: the active tab lives in `?tab=` so deep
 * links (`/orders/abc?tab=payments`) and the browser back button
 * restore the correct view. When the active tab equals the
 * default, the param is omitted from the URL to keep clean URLs
 * for shareable links.
 *
 * Usage:
 *
 *   const tab = useUrlTab('items', ['items', 'revisions', 'payments']);
 *   <Tabs.Root value={tab.value} onValueChange={tab.set}> ... </Tabs.Root>
 *
 * Invalid `?tab=` values (unknown / typo) fall back to the
 * default — defensive against stale links when tab IDs change.
 */
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { SvelteURL } from 'svelte/reactivity';

export interface UseUrlTab {
	/** Current tab value, projected from `?tab=` (or the default). */
	readonly value: string;
	/** Switch tab. Updates the URL via `replaceState` (no history pollution). */
	set(next: string): void;
}

/**
 * @param defaultTab — value to use when `?tab=` is absent or invalid
 * @param valid — optional whitelist of accepted tab values
 * @param param — search-param name (default `'tab'`)
 */
export function useUrlTab(defaultTab: string, valid?: readonly string[], param = 'tab'): UseUrlTab {
	function set(next: string): void {
		const url = new SvelteURL(page.url);
		if (next === defaultTab) url.searchParams.delete(param);
		else url.searchParams.set(param, next);
		void goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}

	return {
		get value(): string {
			const raw = page.url.searchParams.get(param);
			if (!raw) return defaultTab;
			if (valid && !valid.includes(raw)) return defaultTab;
			return raw;
		},
		set
	};
}
