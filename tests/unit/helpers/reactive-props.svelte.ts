/**
 * Props for `mount()` that a test can change afterwards (`props.open = false; flushSync()`).
 * Runes only compile in `.svelte.ts`, so test files get theirs from here.
 */
export function reactiveProps<T extends object>(initial: T): T {
	const props = $state(initial);
	return props;
}
