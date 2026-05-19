<script lang="ts">
	import { Alert, Badge, Button, Card, CopyButton, Spinner } from '$ui';
	import { Eye, Icon } from '$icons';
	import ImpersonateModal from '$features/operator/impersonation/components/ImpersonateModal.svelte';
	import { tenantBySlugQuery } from '$features/operator/tenants/queries';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import { hasCapability, myCapabilitiesQuery } from '$features/auth/queries';

	let { data } = $props();

	let impersonateOpen = $state(false);

	const capsQuery = myCapabilitiesQuery();
	const canView = $derived(hasCapability(capsQuery.data, 'platform.tenants.view'));
	const slug = $derived(data.slug);
	const query = $derived(tenantBySlugQuery(slug));
	const tenant = $derived(query.data ?? null);
</script>

<svelte:head>
	<title>{tenant?.display_name ?? 'Tenant'} · Profile · LeadKart</title>
</svelte:head>

{#if query.isPending}
	<div class="flex justify-center py-16"><Spinner size={32} /></div>
{:else if query.isError}
	<Alert variant="warning" title="Tenant not found">
		No tenant with that ID or slug, or you don't have access.
	</Alert>
{:else if tenant}
	{@const badge = tenantLifecycleBadge(tenant)}
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
						<dt class="caption text-fg-muted">Admin email</dt>
						<dd class="body-base text-fg">{tenant.admin_email || '—'}</dd>
					</div>
					<div>
						<dt class="caption text-fg-muted">Slug</dt>
						<dd class="cluster cluster-tight">
							<code class="caption text-fg-subtle">{tenant.slug}</code>
							<CopyButton value={tenant.slug} label="Copy slug" />
						</dd>
					</div>
					<div>
						<dt class="caption text-fg-muted">Tenant ID</dt>
						<dd class="cluster cluster-tight">
							<code class="caption text-fg-subtle">{tenant.id}</code>
							<CopyButton value={tenant.id} label="Copy tenant ID" />
						</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>
	</div>
{/if}

<ImpersonateModal
	bind:open={impersonateOpen}
	{tenant}
	onOpenChange={(o) => (impersonateOpen = o)}
/>
