<script lang="ts">
	/**
	 * ReloadNotice — the two things a hard reset (`api/hard-reset.ts`) owes the user.
	 *
	 *   After the load: ONE toast saying why the page was reloaded (the reason the previous page left in
	 *   `sessionStorage`). A toast posted before the reset would die with the old document.
	 *   Instead of a reset: a banner when it could not happen. Offline (a reload would land on the
	 *   offline page) it offers Reload, and reloads by itself once the connection is back; in a loop
	 *   (the page that just loaded was itself a reset) it offers signing in again; when the reset
	 *   started but the document is still here (cancelled, or a very slow reload) it offers Reload. Until then the
	 *   page is stale and the BFF keeps refusing its calls.
	 *
	 * Mounted by the (app) layout and the (auth) layout (a sign-out elsewhere lands on /signin).
	 */
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { Alert, Button, toast } from '$ui';
	import { hardReset, replaceLocation, takeReloadReason } from '#lib/api/hard-reset.ts';
	import { resetBlock } from '#lib/api/reset-block.svelte.ts';

	onMount(() => {
		const reason = takeReloadReason();
		if (!reason) return;
		const line =
			reason === 'context'
				? $_('reload.context')
				: reason === 'session'
					? $_('reload.session')
					: $_('errors.code.scope_invalid');
		// The root layout's Toaster empties the toast queue when it mounts (svelte-sonner `reset()`),
		// and it mounts AFTER this child: a toast posted now would be wiped. One macrotask later it is shown.
		const timer = setTimeout(() => toast.info(line), 0);
		return () => clearTimeout(timer);
	});

	// Offline block: the moment the connection returns, do the reset that could not happen.
	$effect(() => {
		if (resetBlock.kind !== 'offline') return;
		const retry = () => {
			// The SAME reset that was declined (its reason and what started it).
			const { reason, source } = resetBlock.retry;
			resetBlock.clear();
			hardReset(reason, undefined, source);
		};
		window.addEventListener('online', retry);
		return () => window.removeEventListener('online', retry);
	});
</script>

{#if resetBlock.kind}
	<div
		class="pointer-events-none fixed inset-x-0 z-[var(--z-banner)] flex justify-center px-4"
		style="inset-block-start: max(var(--shell-topbar-top), var(--safe-top, 0px));"
	>
		<Alert
			variant="warning"
			title={$_(`reload.${resetBlock.kind}.title`)}
			class="pointer-events-auto max-w-3xl"
		>
			<p>{$_(`reload.${resetBlock.kind}.body`)}</p>
			<div class="mt-3">
				{#if resetBlock.kind === 'loop'}
					<Button size="sm" onclick={() => replaceLocation('/signin')}
						>{$_('reload.loop.action')}</Button
					>
				{:else}
					<Button size="sm" onclick={() => replaceLocation(location.pathname + location.search)}
						>{$_(`reload.${resetBlock.kind}.action`)}</Button
					>
				{/if}
			</div>
		</Alert>
	</div>
{/if}
