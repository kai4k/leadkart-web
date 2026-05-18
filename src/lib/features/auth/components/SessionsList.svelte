<script lang="ts">
	import { Alert, Badge, Button } from '$ui';
	import * as Card from '$ui/card';
	import { Trash2, LogOut, Icon } from '$icons';
	import { sessions } from '$features/auth/stores/sessions.svelte';
	import { isCurrentSession, lastSeenLabel } from '$features/auth/view-models';

	/**
	 * SessionsList — one Card row per session family.
	 * Current session is badged + cannot be revoked from this list
	 * (revoke-all-others does the equivalent for the user). Server
	 * also rejects deleting the active family at the gateway.
	 */

	let revokeError = $state<string | null>(null);
	let revokeAllError = $state<string | null>(null);
	let revokeAllPending = $state(false);
	let revokingFamilyId = $state<string | null>(null);

	async function onRevoke(familyId: string) {
		revokeError = null;
		revokingFamilyId = familyId;
		try {
			await sessions.revoke(familyId);
		} catch (err) {
			revokeError = err instanceof Error ? err.message : 'Failed to revoke session';
		} finally {
			revokingFamilyId = null;
		}
	}

	async function onRevokeOthers() {
		revokeAllError = null;
		revokeAllPending = true;
		try {
			const count = await sessions.revokeOthers();
			if (count === 0) revokeAllError = 'No other sessions to revoke.';
		} catch (err) {
			revokeAllError = err instanceof Error ? err.message : 'Failed to revoke other sessions';
		} finally {
			revokeAllPending = false;
		}
	}
</script>

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h2 class="h5">Active sessions</h2>
			<p class="caption text-[var(--color-fg-muted)]">
				Each row is a device or browser signed in to your account.
			</p>
		</div>
		<Button
			variant="ghost"
			onclick={onRevokeOthers}
			loading={revokeAllPending}
			disabled={revokeAllPending || sessions.list.length <= 1}
		>
			<Icon icon={LogOut} size="sm" /> Sign out other devices
		</Button>
	</header>

	{#if revokeAllError}
		<Alert variant="warning">{revokeAllError}</Alert>
	{/if}
	{#if revokeError}
		<Alert variant="danger">{revokeError}</Alert>
	{/if}

	{#if sessions.list.length === 0}
		<Card.Root>
			<Card.Content class="text-center">
				<p class="body-base text-[var(--color-fg-muted)]">No active sessions.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<ul class="stack stack-tight" aria-label="Active sessions">
			{#each sessions.list as sess (sess.family_id)}
				{@const current = isCurrentSession(sess, sessions.activeFamilyId)}
				<li>
					<Card.Root>
						<Card.Content class="flex items-center justify-between gap-4">
							<div class="stack stack-tight min-w-0">
								<div class="cluster">
									<p class="body-base truncate font-medium text-[var(--color-fg)]">
										{sess.device_label || 'Unknown device'}
									</p>
									{#if current}
										<Badge variant="success" style="soft" size="sm">This device</Badge>
									{/if}
								</div>
								<p class="caption text-[var(--color-fg-muted)]">
									Last active {lastSeenLabel(sess.last_used_at)} · Started
									{lastSeenLabel(sess.created_at)}
								</p>
							</div>
							{#if !current}
								<Button
									variant="ghost"
									size="sm"
									aria-label="Revoke session"
									loading={revokingFamilyId === sess.family_id}
									disabled={revokingFamilyId !== null}
									onclick={() => onRevoke(sess.family_id)}
								>
									<Icon icon={Trash2} size="sm" /> Revoke
								</Button>
							{/if}
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>
	{/if}
</div>
