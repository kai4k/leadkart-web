<script lang="ts">
	import { Alert, Badge, Button, Card } from '$ui';
	import { Trash2, LogOut, Icon } from '$icons';
	import {
		mySessionsQuery,
		revokeSessionMutation,
		revokeOtherSessionsMutation
	} from '$features/auth/queries';
	import { isCurrentSession, lastSeenLabel } from '$features/auth/view-models';

	/**
	 * SessionsList — one Card row per session family.
	 * Current session is badged + cannot be revoked from this list.
	 * TanStack Query drives fetch + optimistic updates.
	 */

	// BFF model: refresh token is httpOnly — the browser can no longer decode
	// the `fam` claim from it. currentFamilyId degrades to null; "This device"
	// badge is suppressed until the backend adds family_id to capabilities.
	const currentFamilyId: string | null = null;
	const sessionsQuery = mySessionsQuery();
	const revokeMutation = revokeSessionMutation();
	const revokeOthersMutation = $derived(revokeOtherSessionsMutation(currentFamilyId));

	const sessionList = $derived(sessionsQuery.data ?? []);

	let revokingFamilyId = $state<string | null>(null);

	async function onRevoke(familyId: string) {
		revokingFamilyId = familyId;
		revokeMutation.mutate(familyId, {
			onSettled: () => {
				revokingFamilyId = null;
			}
		});
	}

	async function onRevokeOthers() {
		revokeOthersMutation.mutate();
	}
</script>

<div class="stack stack-relaxed">
	<header class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
		<div class="stack stack-tight">
			<h2 class="h5">Active sessions</h2>
			<p class="caption text-fg-muted">
				Each row is a device or browser signed in to your account.
			</p>
		</div>
		<Button
			variant="ghost"
			onclick={onRevokeOthers}
			loading={revokeOthersMutation.isPending}
			disabled={revokeOthersMutation.isPending || sessionList.length <= 1}
		>
			<Icon icon={LogOut} size="sm" /> Sign out other devices
		</Button>
	</header>

	{#if sessionsQuery.isError}
		<Alert variant="danger"
			>{sessionsQuery.error instanceof Error
				? sessionsQuery.error.message
				: 'Failed to load sessions'}</Alert
		>
	{/if}

	{#if sessionList.length === 0 && !sessionsQuery.isPending}
		<Card.Root>
			<Card.Content class="text-center">
				<p class="body-base text-fg-muted">No active sessions.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<ul class="stack stack-tight" aria-label="Active sessions">
			{#each sessionList as sess (sess.family_id)}
				{@const current = isCurrentSession(sess, currentFamilyId)}
				<li>
					<Card.Root>
						<Card.Content
							class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4"
						>
							<div class="stack stack-tight min-w-0">
								<div class="cluster flex-wrap">
									<p class="body-base text-fg truncate font-medium">
										{sess.device_label || 'Unknown device'}
									</p>
									{#if current}
										<Badge variant="success" style="soft" size="sm">This device</Badge>
									{/if}
								</div>
								<p class="caption text-fg-muted">
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
