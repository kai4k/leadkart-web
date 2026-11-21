<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Button } from '$ui';
	import { Eye, LogOut, Icon } from '$icons';
	import ContextBanner from '$layouts/ContextBanner.svelte';
	import { impersonation } from '../stores/impersonation.svelte';
	import { session } from '$features/auth';
	import { formatDateTime } from '#lib/utils/format.ts';
	import { resetPending } from '#lib/api/hard-reset.ts';
	import EntityName from '$layouts/EntityName.svelte';

	// Reconcile impersonation state once the session's capabilities are there.
	// Must live here (inside <QueryClientProvider>) not in (app)/+layout.svelte
	// (the provider) — TanStack Query v6 uses getContext() to find the client.
	$effect(() => {
		if (session.capabilities) {
			impersonation.reconcile().catch(() => {});
		}
	});

	// Another tab may have started or ended a session: a tab that comes back to the front, or gets focus,
	// reconciles again (the mount effect above covers only the first load).
	$effect(() => {
		if (!session.capabilities) return;
		const again = () => {
			if (document.visibilityState !== 'visible' || impersonation.status === 'loading') return;
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
	async function endNow() {
		if (resetPending()) return;
		try {
			await impersonation.end();
		} catch {
			/* error surfaced via store.error */
		}
	}
</script>

{#if impersonation.active}
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
		{#snippet action({ stale })}
			<Button
				variant="outline"
				size="sm"
				loading={ending}
				aria-disabled={stale ? 'true' : undefined}
				onclick={stale ? undefined : endNow}
				aria-label={$_('shell.impersonation.endLabel')}
			>
				<Icon icon={LogOut} size="sm" />
				{$_('shell.impersonation.end')}
			</Button>
		{/snippet}
	</ContextBanner>
{/if}
