<script lang="ts">
	import { Badge, Button, Card, CopyButton } from '$ui';
	import { Eye, Icon } from '$icons';
	import ImpersonateModal from '$features/operator/impersonation/components/ImpersonateModal.svelte';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import { hasCapability, myCapabilitiesQuery } from '$features/auth/queries';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	let impersonateOpen = $state(false);

	const tenant = $derived(data.tenant);
	const capsQuery = myCapabilitiesQuery();
	const canView = $derived(hasCapability(capsQuery.data, 'platform.tenants.view'));
	const badge = $derived(tenantLifecycleBadge(tenant));
</script>

<svelte:head><title>Profile · {tenant.display_name} · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<Badge variant={badge.variant} appearance="soft" size="sm">{badge.label}</Badge>
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
					<dt class="caption text-fg-muted">GSTIN</dt>
					<dd class="body-base text-fg">{tenant.gst_number || '—'}</dd>
				</div>
				<div>
					<dt class="caption text-fg-muted">PAN</dt>
					<dd class="body-base text-fg">{tenant.pan_number || '—'}</dd>
				</div>
				<div>
					<dt class="caption text-fg-muted">Drug licence</dt>
					<dd class="body-base text-fg">{tenant.drug_licence_number || '—'}</dd>
				</div>
				<div>
					<dt class="caption text-fg-muted">Phone</dt>
					<dd class="body-base text-fg">{tenant.admin_phone || '—'}</dd>
				</div>
				<div>
					<dt class="caption text-fg-muted">Slug</dt>
					<dd class="cluster cluster-tight">
						<code class="caption text-fg-subtle">{tenant.slug}</code>
						<CopyButton value={tenant.slug} label="Copy slug" />
					</dd>
				</div>
			</dl>
		</Card.Content>
	</Card.Root>
</div>

<ImpersonateModal
	bind:open={impersonateOpen}
	{tenant}
	onOpenChange={(o) => (impersonateOpen = o)}
/>
