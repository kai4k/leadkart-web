/** Runs `fn` inside an effect root so factories that declare `$effect` can be unit-tested. */
export function inRoot<T>(fn: () => T): { value: T; dispose: () => void } {
	let value!: T;
	const dispose = $effect.root(() => {
		value = fn();
	});
	return { value, dispose };
}
