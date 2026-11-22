/**
 * A value that can be read ONCE. TanStack keeps a mutation's `variables` in its cache until the mutation is collected
 * (5 minutes by default), so a mutation whose variables carry a credential (the initial password of a new member or of a
 * new company's admin) is called with a one-shot holder instead: after the request has taken the value, the cache holds
 * an empty shell. A second `take()` is a bug and throws.
 */
export interface OneShot<T> {
	take(): T;
}

export function oneShot<T>(value: T): OneShot<T> {
	let held: { value: T } | null = { value };
	return {
		take() {
			// eslint-disable-next-line no-restricted-syntax -- a programming error, never an API failure
			if (!held) throw new Error('A one-shot value was read twice.');
			const { value: out } = held;
			held = null;
			return out;
		}
	};
}
