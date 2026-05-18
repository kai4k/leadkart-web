<script lang="ts">
	import { Alert, Badge, Card, Spinner } from '$ui';
	import TenantActionPanel from '$features/operator/tenants/components/TenantActionPanel.svelte';
	import SuspendDialog from '$features/operator/tenants/components/SuspendDialog.svelte';
	import MarkForDeletionDialog from '$features/operator/tenants/components/MarkForDeletionDialog.svelte';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import type { TenantDto } from '$features/operator/tenants/types';

	let { data } = $props();

	let suspendOpen = $state(false);
	let markOpen = $state(false);
	let target = $state<TenantDto | null>(null);

	$effect(() => {
		if (data.tenantId) {
			operatorTenants.loadDetail(data.tenantId).catch(() => {});
		}
	});

	function onAction(action: 'suspend' | 'mark', tenant: TenantDto) {
		target = tenant;
		if (action === 'suspend') suspendOpen = true;
		else markOpen = true;
	}
</script>

<svelte:head
	><title>{operatorTenants.current?.display_name ?? 'Tenant'} · LeadKart</title></svelte:head
>

<div class="stack stack-relaxed">
	<a
		href="/operator/tenants"
		class="caption text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">← All tenants</a
	>

	{#if operatorTenants.status === 'loading'}
		<div class="flex justify-center py-16"><Spinner size={32} /></div>
	{:else if !operatorTenants.current}
		<Alert variant="warning" title="Tenant not found"
			>No tenant with that ID, or you don't have access.</Alert
		>
	{:else}
		{@const t = operatorTenants.current}
		{@const badge = tenantLifecycleBadge(t)}
		<header class="stack stack-tight">
			<div class="cluster cluster-tight">
				<h1 class="h1">{t.display_name}</h1>
				<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
			</div>
			<p class="caption text-[var(--color-fg-muted)]">
				{t.slug} · {t.legal_name} · ID <code>{t.id}</code>
			</p>
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
				</dl>
			</Card.Content>
		</Card.Root>

		<TenantActionPanel tenant={t} {onAction} />
	{/if}
</div>

<SuspendDialog bind:open={suspendOpen} tenant={target} onOpenChange={(o) => (suspendOpen = o)} />
<MarkForDeletionDialog bind:open={markOpen} tenant={target} onOpenChange={(o) => (markOpen = o)} />
