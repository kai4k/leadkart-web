import { flushSync } from 'svelte';
import { useLeaveGuard } from '#lib/hooks/use-leave-guard.svelte.ts';

/** A leave guard needs an effect root outside a component. Returns the disposer. */
export function guardInRoot(dirty: () => boolean): () => void {
	const dispose = $effect.root(() => useLeaveGuard(dirty));
	flushSync();
	return dispose;
}
