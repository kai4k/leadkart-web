<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import { Button } from '$ui';
	import { Eye, LogOut, Icon } from '$icons';
	import ContextBanner from '$layouts/ContextBanner.svelte';
	import { impersonation } from '../stores/impersonation.svelte';
	import { P, session } from '$features/auth';
	import { formatDateTime } from '#lib/utils/format.ts';
	import { resetPending } from '#lib/api/hard-reset.ts';
	import EntityName from '$layouts/EntityName.svelte';

	// Reconcile impersonation state once the session's capabilities are there. The call is untracked: reconcile() reads
	// the store's own state, and an effect that tracked it would run again on every settle (a request loop).
	// Must live here (inside <QueryClientProvider>) not in (app)/+layout.svelte
	// (the provider) — TanStack Query v6 uses getContext() to find the client.
	// Only a person who can impersonate asks: nobody else has a session to show, and no read is made for them.
	const canImpersonate = $derived(session.can(P.platformImpersonationManage));
	// A different person on the same mounted layout (no unmount in between) is read for at once, not on the next focus.
	const personId = $derived(
		(page.data as { capabilities?: { person_id?: string } } | undefined)?.capabilities?.person_id
	);
	$effect(() => {
		if (canImpersonate && personId) {
			untrack(() => impersonation.reconcile()).catch(() => {});
		}
	});
	// Leaving the signed-in app (sign-out) empties the store: nothing of this person is left for the next one.
	onDestroy(() => impersonation.forget());

	// Another tab may have started or ended a session: a tab that comes back to the front, or gets focus,
	// reconciles again (the mount effect above covers only the first load).
	$effect(() => {
		if (!canImpersonate) return;
		const again = () => {
			if (
				document.visibilityState !== 'visible' ||
				impersonation.status === 'loading' ||
				impersonation.status === 'mutating'
			)
				return;
			impersonation.reconcile().catch(() => {});
		};
		document.addEventListener('visibilitychange', again);
		window.addEventListener('focus', again);
		return () => {
			document.removeEventListener('visibilitychange', again);
			window.removeEventListener('focus', again);
		};
	});

	const ending = $derived(impersonation.status === 'mutating');

	// a reset can start between the last render and this click: re-check, like Exit does
	// the id is the one SHOWN when the user clicked, not whatever is shown when the request runs
	async function endNow(sessionId: string) {
		if (resetPending()) return;
		try {
			await impersonation.end(sessionId);
		} catch {
			/* the failure is rendered from store.error */
		}
	}
	async function retryRead() {
		if (resetPending()) return;
		await impersonation.reconcile().catch(() => {});
	}
</script>

{#if impersonation.active}
	{@const shown = impersonation.active}
	<ContextBanner tone="destructive" icon={Eye} label={$_('shell.impersonation.region')}>
		<span class="font-medium">
			{#if impersonation.targetName}
				<EntityName
					messageKey="shell.impersonation.impersonating"
					name={impersonation.targetName}
				/>
			{:else}
				{$_('shell.impersonation.impersonatingCompany')}
			{/if}
		</span>
		<span class="ms-2">
			{$_('shell.impersonation.details', {
				values: {
					reason: impersonation.active.reason,
					expires: formatDateTime(impersonation.active.expires_at)
				}
			})}
		</span>
		{#if impersonation.more > 0}
			<span class="ms-2"
				>{$_('shell.impersonation.more', { values: { count: impersonation.more } })}</span
			>
		{/if}
		{#if impersonation.endError}
			<span class="ms-2 font-medium" role="alert">{impersonation.endError}</span>
		{:else if impersonation.readError}
			<span class="ms-2">
				{$_('shell.impersonation.refreshFailed')}
				<Button variant="link" size="sm" onclick={retryRead}
					>{$_('shell.impersonation.retry')}</Button
				>
			</span>
		{/if}
		{#snippet action({ stale })}
			<Button
				variant="outline"
				size="sm"
				loading={ending}
				aria-disabled={stale ? 'true' : undefined}
				onclick={stale ? undefined : () => endNow(shown.session_id)}
				aria-label={impersonation.endError ? undefined : $_('shell.impersonation.endLabel')}
			>
				<Icon icon={LogOut} size="sm" />
				{impersonation.endError
					? $_('shell.impersonation.endRetry')
					: $_('shell.impersonation.end')}
			</Button>
		{/snippet}
	</ContextBanner>
{:else if canImpersonate && impersonation.unknown}
	<ContextBanner tone="warning" icon={Eye} label={$_('shell.impersonation.region')}>
		<span class="font-medium"
			>{impersonation.checking
				? $_('shell.impersonation.checking')
				: $_('shell.impersonation.unknown')}</span
		>
		{#snippet action({ stale })}
			<Button
				variant="outline"
				size="sm"
				loading={impersonation.status === 'loading'}
				aria-disabled={stale ? 'true' : undefined}
				onclick={stale ? undefined : retryRead}
			>
				{$_('shell.impersonation.retry')}
			</Button>
		{/snippet}
	</ContextBanner>
{/if}
