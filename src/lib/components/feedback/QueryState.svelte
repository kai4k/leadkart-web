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
	import { _ } from 'svelte-i18n';
	import type { Snippet } from 'svelte';
	import { Alert, Button, EmptyState, Skeleton } from '#lib/components/ui/index.ts';
	import { Inbox } from '#lib/icons/index.ts';
	import { AuthError, isTransientError, NotFoundError } from '#lib/api/errors.ts';
	import { getListErrorMessage } from '#lib/api/error-messages.ts';

	type Props = {
		query: QueryLike<T>;
		/** What is being loaded, as it reads in a sentence: "member", "sessions", "this request". */
		noun: string;
		/** Body of the 404 alert; the shared "no longer available" line when omitted. */
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
	const title = $derived(
		missing
			? $_('common.query.notFound')
			: forbidden
				? $_('common.query.noAccess')
				: $_('common.query.couldntLoad', { values: { noun } })
	);
	const message = $derived(getListErrorMessage(query.error, noun, notFound));
	// A failed refetch keeps the data on screen only when the failure may pass (network, timeout, 5xx,
	// 429). A 403 / 404 / other answer means the record may be gone or the access lost: not the old data.
	const keepsData = $derived(!query.isError || isTransientError(query.error));
	const canRetry = $derived(!missing && !forbidden && query.refetch !== undefined);
</script>

{#snippet failure(heading: string)}
	<Alert variant={missing || forbidden ? 'warning' : 'destructive'} title={heading}>
		<div class="stack stack-tight">
			<p>{message}</p>
			{#if canRetry}
				<div>
					<Button variant="ghost" size="sm" onclick={() => query.refetch?.()}
						>{$_('common.query.tryAgain')}</Button
					>
				</div>
			{/if}
		</div>
	</Alert>
{/snippet}

{#if query.isPending}
	<!-- A div with aria-label and no role is ignored by screen readers: a status region with real text. -->
	<!-- No aria-busy: on a live region it lets assistive technology hold back the very announcement this is for. -->
	<div class="stack stack-relaxed" role="status">
		<span class="sr-only">{$_('common.query.loadingNoun', { values: { noun } })}</span>
		{#if skeleton}
			{@render skeleton()}
		{:else}
			<Skeleton class="h-7 w-1/2" />
			<Skeleton class="h-32 w-full rounded-md" />
		{/if}
	</div>
{:else if query.data === undefined}
	{#if query.isError}
		{@render failure(title)}
	{/if}
{:else if !keepsData}
	{@render failure(title)}
{:else}
	<!-- A failed refetch that may pass keeps the data on screen (still the last good answer) with a notice. -->
	{#if query.isError}
		{@render failure($_('common.query.couldntRefresh', { values: { noun } }))}
	{/if}
	{#if isEmpty?.(query.data)}
		{#if empty}
			{@render empty()}
		{:else}
			<!-- English only (L46): `noun` is an English word here. When a second locale is enabled it must become a locale key (callers pass a key, this resolves it), or the sentence cannot be built. -->
			<EmptyState icon={Inbox} title={$_('common.query.noneYet', { values: { noun } })} />
		{/if}
	{:else}
		{@render children(query.data)}
	{/if}
{/if}
