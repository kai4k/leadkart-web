<script lang="ts">
	import { Badge, Button, EmptyState } from '#lib/components/ui/index.ts';
	import { Trash2, LogOut, Icon } from '#lib/icons/index.ts';
	import type { DataTableColumn } from '#lib/components/data/index.ts';
	import { DataTable } from '#lib/components/data/data-table/index.ts';
	import {
		mySessionsQuery,
		revokeSessionMutation,
		revokeOtherSessionsMutation
	} from '#lib/features/auth/queries.ts';
	import type { SessionDto } from '#lib/features/auth/types.ts';
	import { relativeTime } from '#lib/utils/format.ts';

	/**
	 * SessionsList — the person's signed-in devices as a table, one row per session family.
	 * "Sign out other devices" asks Go for `except_current`: the session of this access token stays.
	 * Go marks the caller's own row `is_current`: it gets a "This device" badge and no Revoke (Sign out covers it).
	 */
	const sessionsQuery = mySessionsQuery();
	const revokeMutation = revokeSessionMutation();
	const revokeOthersMutation = revokeOtherSessionsMutation();

	const sessionList = $derived(sessionsQuery.data ?? []);

	let revokingFamilyId = $state<string | null>(null);

	function onRevoke(familyId: string) {
		revokingFamilyId = familyId;
		revokeMutation.mutate(familyId, {
			onSettled: () => {
				revokingFamilyId = null;
			}
		});
	}

	const deviceName = (s: SessionDto) => s.device_label || 'Unknown device';

	const columns: DataTableColumn<SessionDto>[] = [
		{
			id: 'device',
			header: 'Device',
			accessor: deviceName,
			cell: deviceCell,
			class: 'font-medium'
		},
		{
			id: 'last',
			header: 'Last active',
			accessor: (s) => relativeTime(s.last_used_at),
			class: 'text-muted-foreground'
		},
		{
			id: 'started',
			header: 'Started',
			accessor: (s) => relativeTime(s.created_at),
			hideBelow: 'md',
			class: 'text-muted-foreground'
		}
	];
</script>

{#snippet deviceCell(sess: SessionDto)}
	<span class="inline-flex flex-wrap items-center gap-2">
		{deviceName(sess)}
		{#if sess.is_current}<Badge variant="brand" size="sm">This device</Badge>{/if}
	</span>
{/snippet}

{#snippet rowActions(sess: SessionDto)}
	{#if !sess.is_current}
		<Button
			variant="ghost"
			size="sm"
			aria-label="Revoke session {deviceName(sess)}"
			loading={revokingFamilyId === sess.family_id}
			disabled={revokingFamilyId !== null}
			onclick={() => onRevoke(sess.family_id)}
		>
			<Icon icon={Trash2} size="sm" /> Revoke
		</Button>
	{/if}
{/snippet}

{#snippet empty()}
	<EmptyState title="No active sessions" description="No device is signed in to this account." />
{/snippet}

<div class="stack stack-relaxed">
	<header class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
		<div class="stack stack-tight">
			<h2 class="h5">Active sessions</h2>
			<p class="caption text-muted-foreground">
				Each row is a device or browser signed in to your account.
			</p>
			<p id="sign-out-others-note" class="caption text-muted-foreground">
				This device stays signed in. Every other device is signed out; its access ends within 10
				minutes at the latest.
			</p>
		</div>
		<Button
			variant="ghost"
			onclick={() => revokeOthersMutation.mutate({ keepFamilyId: null })}
			loading={revokeOthersMutation.isPending}
			disabled={revokeOthersMutation.isPending || sessionList.length === 0}
			aria-describedby="sign-out-others-note"
		>
			<Icon icon={LogOut} size="sm" /> Sign out other devices
		</Button>
	</header>

	<DataTable
		{columns}
		data={sessionList}
		getRowId={(s) => s.family_id}
		noun="sessions"
		caption="Active sessions"
		query={sessionsQuery}
		{rowActions}
		{empty}
	/>
</div>
