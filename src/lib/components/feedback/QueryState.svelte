<script lang="ts" module>
	/** The slice of a TanStack query result `QueryState` reads. The caller creates the query. */
	export interface QueryLike<T> {
		isPending: boolean;
		isError: boolean;
		error: unknown;
		data: T | undefined;
		refetch?: () => unknown;
	}
</script>

<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { Alert, Button, EmptyState, Skeleton } from '#lib/components/ui/index.ts';
	import { Inbox } from '#lib/icons/index.ts';
	import { AuthError, NotFoundError } from '#lib/api/errors.ts';
	import { getListErrorMessage } from '#lib/api/error-messages.ts';

	type Props = {
		query: QueryLike<T>;
		/** What is being loaded, as it reads in a sentence: "member", "sessions", "this request". */
		noun: string;
		/** Body of the 404 alert; the shared "deleted or moved" line when omitted. */
		notFound?: string;
		/** True when `data` has nothing to show; renders `empty` (or the default empty state). */
		isEmpty?: (data: T) => boolean;
		children: Snippet<[T]>;
		/** Placeholder while pending; the default is two skeleton bars. */
		skeleton?: Snippet;
		empty?: Snippet;
	};

	let { query, noun, notFound, isEmpty, children, skeleton, empty }: Props = $props();

	// 404 and 403 are answers, not failures: nothing to retry.
	const missing = $derived(query.error instanceof NotFoundError);
	const forbidden = $derived(query.error instanceof AuthError && query.error.status === 403);
	const title = $derived(missing ? 'Not found' : forbidden ? 'No access' : `Couldn't load ${noun}`);
	const message = $derived(getListErrorMessage(query.error, noun, notFound));
	const canRetry = $derived(!missing && !forbidden && query.refetch !== undefined);
</script>

{#if query.isPending}
	<div class="stack stack-relaxed" aria-busy="true" aria-label="Loading {noun}">
		{#if skeleton}
			{@render skeleton()}
		{:else}
			<Skeleton class="h-7 w-1/2" />
			<Skeleton class="h-32 w-full rounded-md" />
		{/if}
	</div>
{:else if query.isError}
	<Alert variant={missing || forbidden ? 'warning' : 'danger'} {title}>
		<div class="stack stack-tight">
			<p>{message}</p>
			{#if canRetry}
				<div>
					<Button variant="ghost" size="sm" onclick={() => query.refetch?.()}>Try again</Button>
				</div>
			{/if}
		</div>
	</Alert>
{:else if query.data !== undefined}
	{#if isEmpty?.(query.data)}
		{#if empty}
			{@render empty()}
		{:else}
			<EmptyState icon={Inbox} title="No {noun} yet" />
		{/if}
	{:else}
		{@render children(query.data)}
	{/if}
{/if}
