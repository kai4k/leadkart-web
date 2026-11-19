/**
 * `useResetOnChange` — detach a mutation's observer when the surface it reports to goes away.
 *
 * A mutation flagged `inlineErrors` toasts only while an observer is attached (`query-client.ts`):
 * the component that renders the failure inline. A dialog or drawer stays mounted when it closes,
 * and a page stays mounted when its route param changes, so the observer outlives what the user
 * can see. `reset()` detaches it, so a failure that lands later reaches the global toast instead
 * of a banner nobody sees.
 *
 *   useResetOnChange(() => open, mutation);          // dialog / drawer: reset when it opens or closes
 *   useResetOnChange(() => roleId, a, b, c);         // page: reset when the entity changes
 *
 * Runs on mount too (nothing to detach then) and while a call is in flight only because the
 * surface changed, never because the call is pending: dismissal is blocked while saving.
 */
import { untrack } from 'svelte';

export function useResetOnChange(
	source: () => unknown,
	...mutations: Array<{ reset: () => void }>
) {
	$effect(() => {
		void source();
		untrack(() => {
			for (const m of mutations) m.reset();
		});
	});
}
