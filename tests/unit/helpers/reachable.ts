/**
 * Can `needle` be obtained from `root`? Walks the reachable object graph (own properties, array items, Map / Set
 * entries) AND calls every zero-argument function found on the way, because a value hidden in a closure is invisible
 * to JSON.stringify and to a property walk (a holder that keeps the password in a closure and hands it out from
 * `take()` must be found). A function that throws has nothing to hand out. Returns the path of the first hit.
 */
export function reachablePath(root: unknown, needle: string, maxNodes = 5000): string | null {
	const seen = new Set<unknown>();
	let budget = maxNodes;
	const visit = (value: unknown, path: string): string | null => {
		if (--budget < 0) return null;
		if (typeof value === 'string') return value.includes(needle) ? path : null;
		if (typeof value === 'function') {
			if (seen.has(value)) return null;
			seen.add(value);
			if (value.length > 0) return null;
			let out: unknown;
			try {
				out = (value as () => unknown)();
			} catch {
				return null;
			}
			return visit(out, `${path}()`);
		}
		if (typeof value !== 'object' || value === null) return null;
		if (seen.has(value)) return null;
		seen.add(value);
		const entries: Array<[string, unknown]> =
			value instanceof Map
				? [...value].map(([, v], i) => [`${path}.get#${i}`, v] as [string, unknown])
				: value instanceof Set
					? [...value].map((v, i) => [`${path}.#${i}`, v] as [string, unknown])
					: Reflect.ownKeys(value).map((k) => {
							let v: unknown;
							try {
								v = (value as Record<PropertyKey, unknown>)[k];
							} catch {
								v = undefined;
							}
							return [`${path}.${String(k)}`, v] as [string, unknown];
						});
		for (const [p, v] of entries) {
			const hit = visit(v, p);
			if (hit) return hit;
		}
		return null;
	};
	return visit(root, 'root');
}

/** The holders (anything with `take`) found in a mutation's variables, to be read again after the request settled. */
export function holdersIn(variables: unknown): Array<{ take: () => unknown }> {
	if (
		typeof variables === 'object' &&
		variables !== null &&
		typeof (variables as { take?: unknown }).take === 'function'
	)
		return [variables as { take: () => unknown }];
	return [];
}
