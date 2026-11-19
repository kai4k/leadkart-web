import type { QueryClient } from '@tanstack/svelte-query';
import type * as TanstackQuery from '@tanstack/svelte-query';

/**
 * The ONE test double for TanStack's Svelte binding: real mutation machinery (settling, the
 * client's invalidation, `onSuccess`, toasts) against a real `QueryClient`; only the context
 * lookup and the Svelte binding are replaced. Use it from a `vi.mock` factory:
 *
 *   const h = vi.hoisted(() => ({ qc: undefined as unknown as QueryClient }));
 *   vi.mock('@tanstack/svelte-query', async (importOriginal) =>
 *     (await import('../helpers/real-mutations.svelte.ts')).withRealMutations(
 *       await importOriginal(), () => h.qc));
 *
 * `createMutation` returns the bare observer (`mutate()` is the promise, `options` is readable)
 * plus the binding's `mutateAsync` and a REACTIVE `isPending`, so a component under test sees the
 * button disable while the call is in flight. Anything else (a fake `createQuery`) goes in `overrides`.
 */
export function withRealMutations(
	actual: typeof TanstackQuery,
	qc: () => QueryClient,
	overrides: Record<string, unknown> = {}
) {
	return {
		...actual,
		createQuery: () => undefined,
		useQueryClient: () => qc(),
		createMutation: (opts: () => never) => {
			const observer = new actual.MutationObserver(qc(), opts());
			let pending = $state(false);
			observer.subscribe((result) => {
				pending = result.isPending;
			});
			Object.defineProperty(observer, 'isPending', { get: () => pending });
			Object.defineProperty(observer, 'mutateAsync', {
				value: (vars: never) => observer.mutate(vars)
			});
			return observer;
		},
		...overrides
	};
}
