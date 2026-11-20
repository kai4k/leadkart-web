<script lang="ts">
	import { Button } from '$ui';
	import { Eye, LogOut, Icon } from '$icons';
	import { impersonation } from '../stores/impersonation.svelte';
	import { session } from '$features/auth';
	import { formatDateTime } from '#lib/utils/format.ts';

	// Reconcile impersonation state once the session's capabilities are there.
	// Must live here (inside <QueryClientProvider>) not in (app)/+layout.svelte
	// (the provider) — TanStack Query v6 uses getContext() to find the client.
	$effect(() => {
		if (session.capabilities) {
			impersonation.reconcile().catch(() => {});
		}
	});

	const ending = $derived(impersonation.status === 'mutating');

	async function endNow() {
		try {
			await impersonation.end();
		} catch {
			/* error surfaced via store.error */
		}
	}
</script>

{#if impersonation.active}
	<div
		class="lk-impersonation-banner"
		role="status"
		aria-live="polite"
		aria-label="Active impersonation session"
	>
		<div class="cluster cluster-tight">
			<Icon icon={Eye} size="sm" />
			<span class="label-small">
				Impersonating <code class="rounded bg-black/10 px-1"
					>{impersonation.active.target_tenant_id}</code
				>
				· {impersonation.active.reason}
				· Expires {formatDateTime(impersonation.active.expires_at)}
			</span>
		</div>
		<Button
			variant="ghost"
			size="sm"
			loading={ending}
			onclick={endNow}
			class="!text-white hover:!bg-white/10"
			aria-label="End impersonation session"
		>
			<Icon icon={LogOut} size="sm" /> End impersonation
		</Button>
	</div>
{/if}

<style>
	.lk-impersonation-banner {
		position: fixed;
		inset-inline: 0;
		top: 0;
		z-index: var(--z-banner);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing-2);
		padding-inline: var(--spacing-4);
		padding-block: var(--spacing-2);
		background: var(--color-warning-500);
		color: var(--color-fg-on-brand);
	}

	@media (min-width: 768px) {
		.lk-impersonation-banner {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			gap: var(--spacing-3);
		}
	}
</style>
