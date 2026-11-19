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
	overrides: Record<string, unknown> = {},
	/** `swallowRejections`: `mutate()` resolves on failure, like the real binding (a component calls it without a catch). */
	opts: { swallowRejections?: boolean } = {}
) {
	return {
		...actual,
		createQuery: () => undefined,
		useQueryClient: () => qc(),
		createMutation: (options: () => never) => {
			const observer = new actual.MutationObserver(qc(), options());
			let pending = $state(false);
			observer.subscribe((result) => {
				pending = result.isPending;
			});
			Object.defineProperty(observer, 'isPending', { get: () => pending });
			if (opts.swallowRejections) {
				const mutate = observer.mutate.bind(observer);
				observer.mutate = ((vars, mutateOpts) =>
					mutate(vars, mutateOpts).catch(() => undefined)) as typeof observer.mutate;
			}
			Object.defineProperty(observer, 'mutateAsync', {
				value: (vars: never) => observer.mutate(vars)
			});
			return observer;
		},
		...overrides
	};
}
