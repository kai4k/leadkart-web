<script lang="ts">
	import { Alert, Badge, Button, Card, Spinner } from '$ui';
	import { Eye, Icon } from '$icons';
	import TenantActionPanel from '$features/operator/tenants/components/TenantActionPanel.svelte';
	import SuspendDialog from '$features/operator/tenants/components/SuspendDialog.svelte';
	import MarkForDeletionDialog from '$features/operator/tenants/components/MarkForDeletionDialog.svelte';
	import ImpersonateModal from '$features/operator/impersonation/components/ImpersonateModal.svelte';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import { hasPermission } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	let suspendOpen = $state(false);
	let markOpen = $state(false);
	let impersonateOpen = $state(false);
	let target = $state<TenantDto | null>(null);

	const canView = $derived(hasPermission(session.principal, 'platform.tenants.view'));

	function onAction(action: 'suspend' | 'mark', tenant: TenantDto) {
		target = tenant;
		if (action === 'suspend') suspendOpen = true;
		else markOpen = true;
	}
</script>

<svelte:head>
	<title>{operatorTenants.current?.display_name ?? 'Tenant'} · Profile · LeadKart</title>
</svelte:head>

{#if operatorTenants.status === 'loading' && !operatorTenants.current}
	<div class="flex justify-center py-16"><Spinner size={32} /></div>
{:else if !operatorTenants.current}
	<Alert variant="warning" title="Tenant not found"
		>No tenant with that ID or slug, or you don't have access.</Alert
	>
{:else}
	{@const t = operatorTenants.current}
	{@const badge = tenantLifecycleBadge(t)}
	<div class="stack stack-relaxed">
		<header class="cluster cluster-spread">
			<div class="cluster cluster-tight">
				<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
			</div>
			{#if canView}
				<Button variant="ghost" onclick={() => (impersonateOpen = true)}>
					<Icon icon={Eye} size="sm" /> Impersonate this tenant
				</Button>
			{/if}
		</header>

		<Card.Root>
			<Card.Header>
				<Card.Title>Profile</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="grid grid-cols-2 gap-x-6 gap-y-2">
					<div>
						<dt class="caption text-[var(--color-fg-muted)]">GSTIN</dt>
						<dd class="body-base text-[var(--color-fg)]">{t.gst_number || '—'}</dd>
					</div>
					<div>
						<dt class="caption text-[var(--color-fg-muted)]">PAN</dt>
						<dd class="body-base text-[var(--color-fg)]">{t.pan_number || '—'}</dd>
					</div>
					<div>
						<dt class="caption text-[var(--color-fg-muted)]">Drug licence</dt>
						<dd class="body-base text-[var(--color-fg)]">{t.drug_licence_number || '—'}</dd>
					</div>
					<div>
						<dt class="caption text-[var(--color-fg-muted)]">Phone</dt>
						<dd class="body-base text-[var(--color-fg)]">{t.admin_phone || '—'}</dd>
					</div>
					<div>
						<dt class="caption text-[var(--color-fg-muted)]">Admin email</dt>
						<dd class="body-base text-[var(--color-fg)]">{t.admin_email || '—'}</dd>
					</div>
					<div>
						<dt class="caption text-[var(--color-fg-muted)]">ID</dt>
						<dd class="body-base text-[var(--color-fg)]"><code>{t.id}</code></dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		<TenantActionPanel tenant={t} {onAction} />
	</div>
{/if}

<SuspendDialog bind:open={suspendOpen} tenant={target} onOpenChange={(o) => (suspendOpen = o)} />
<MarkForDeletionDialog bind:open={markOpen} tenant={target} onOpenChange={(o) => (markOpen = o)} />
<ImpersonateModal
	bind:open={impersonateOpen}
	tenant={operatorTenants.current}
	onOpenChange={(o) => (impersonateOpen = o)}
/>
