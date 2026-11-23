/**
 * `createListSearch`: the text typed in a list's search box, kept in the page and NOT in the URL.
 * A name, an email or a tenant slug someone searches for does not belong in the address bar (CLAUDE.md
 * rule 10), but Back must still bring the box and its rows back. SvelteKit does that with a `snapshot`,
 * which only a `+page.svelte` can export, so the page owns this and hands it to the list:
 *
 *   const search = createListSearch();
 *   export const snapshot = search.snapshot;
 *   <TenantsList {search} />
 */
export interface ListSearch {
	/** The text last searched for: trimmed, as the box hands it over. */
	value: string;
	/** SvelteKit's `snapshot`: the text goes into history on leaving and comes back on Back. */
	readonly snapshot: { capture: () => string; restore: (value: string) => void };
}

export function createListSearch(): ListSearch {
	let value = $state('');
	return {
		get value() {
			return value;
		},
		set value(next: string) {
			value = next;
		},
		snapshot: {
			capture: () => value,
			// history written by another build may hold anything: only text comes back
			restore: (restored) => {
				value = typeof restored === 'string' ? restored : '';
			}
		}
	};
}
