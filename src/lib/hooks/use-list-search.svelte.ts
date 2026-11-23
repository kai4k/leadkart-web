/**
 * `createListSearch`: the text typed in a list's search box, kept in the page and NOT in the URL.
 * A name, an email or a tenant slug someone searches for does not belong in the address bar (CLAUDE.md
 * rule 10), but Back must still bring the box and its rows back. SvelteKit does that with a `snapshot`,
 * which only a `+page.svelte` can export, so the page owns this and hands it to the list:
 *
 *   const search = createListSearch();
 *   export const snapshot = search.snapshot;
 *   <TenantsList {search} />
 *
 * SvelteKit writes a snapshot into `sessionStorage`, and that outlives a sign-out: the next person on
 * the tab would press Back and see (and send) the previous person's search. So the text is NEVER part
 * of the snapshot. It stays in this module's memory, under an opaque key; the snapshot is only that key.
 * An entry belongs to the person who typed it and to the list it was typed in: a restore by anyone
 * else, or on another list, gets an empty box. A full page load (the sign-out path) empties the memory.
 */
import { page } from '$app/state';
import { SvelteMap } from 'svelte/reactivity';

export interface ListSearch {
	/** The text last searched for: trimmed, as the box hands it over. */
	value: string;
	/** SvelteKit's `snapshot`: an opaque key goes into history on leaving; Back swaps it for the text. */
	readonly snapshot: { capture: () => string; restore: (key: string) => void };
}

type Entry = { personId: string; list: string; value: string };

/** Plain memory (nothing renders from it): read only when a snapshot is captured or restored. */
const entries = new SvelteMap<string, Entry>();
/** A tab that hops through many lists keeps no more than this many remembered searches. */
const MAX_ENTRIES = 50;

function currentPersonId(): string | null {
	const data = page.data as { capabilities?: { person_id?: string } } | undefined;
	return data?.capabilities?.person_id ?? null;
}

function currentList(): string {
	return (page as { route?: { id?: string | null } }).route?.id ?? '';
}

/** Another person is signed in on this tab now: what the earlier one searched for is dropped. */
function dropOthers(personId: string | null) {
	for (const [key, entry] of entries) if (entry.personId !== personId) entries.delete(key);
}

export function createListSearch(): ListSearch {
	let value = $state('');
	const list = currentList();
	const key = crypto.randomUUID();

	return {
		get value() {
			return value;
		},
		set value(next: string) {
			value = next;
		},
		snapshot: {
			capture: () => {
				const personId = currentPersonId();
				dropOthers(personId);
				if (personId && value) {
					entries.delete(key);
					entries.set(key, { personId, list, value });
					if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value as string);
				} else {
					entries.delete(key);
				}
				return key;
			},
			// history written by another build may hold anything: only a key we handed out resolves
			restore: (restored) => {
				const personId = currentPersonId();
				dropOthers(personId);
				const entry = typeof restored === 'string' ? entries.get(restored) : undefined;
				value = entry && entry.personId === personId && entry.list === list ? entry.value : '';
			}
		}
	};
}
