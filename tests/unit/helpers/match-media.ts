/**
 * A controllable `window.matchMedia` for jsdom (which has none): `setViewportWidth(px)` flips every
 * `(min-width)` / `(max-width)` query and dispatches a real `change` event on the ones that flipped.
 * Svelte's `MediaQuery` (the sidebar's `createIsMobile`) listens to exactly that.
 */
interface Query {
	text: string;
	matches: boolean;
	list: EventTarget;
}

function limit(text: string, key: 'min' | 'max'): number | null {
	const m = new RegExp(`\\(${key}-width:\\s*([\\d.]+)(px|rem)\\)`).exec(text);
	if (!m) return null;
	return m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
}

export function installMatchMedia(initialWidth: number): { setViewportWidth: (w: number) => void } {
	let width = initialWidth;
	const queries = new Map<string, Query>();
	const evaluate = (text: string): boolean => {
		const min = limit(text, 'min');
		const max = limit(text, 'max');
		return (min === null || width >= min) && (max === null || width <= max);
	};
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		writable: true,
		value: (text: string) => {
			let q = queries.get(text);
			if (!q) {
				const list = new EventTarget();
				q = { text, matches: evaluate(text), list };
				const state = q;
				Object.defineProperty(list, 'matches', { get: () => state.matches });
				Object.defineProperty(list, 'media', { value: text });
				queries.set(text, q);
			}
			return q.list;
		}
	});
	return {
		setViewportWidth(w) {
			width = w;
			for (const q of queries.values()) {
				const next = evaluate(q.text);
				if (next === q.matches) continue;
				q.matches = next;
				q.list.dispatchEvent(Object.assign(new Event('change'), { matches: next }));
			}
		}
	};
}
