<script lang="ts">
	import { Badge, Button, Card, CopyButton, DescriptionList } from '$ui';
	import { Eye, Icon } from '$icons';
	import { ImpersonateModal } from '$features/operator/impersonation';
	import { tenantStatus } from '$features/tenant';
	import { P, session } from '$features/auth';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	let impersonateOpen = $state(false);

	const tenant = $derived(data.tenant);
	const canImpersonate = $derived(session.can(P.platformImpersonationManage));
	const badge = $derived(tenantStatus(tenant.status));
</script>

<svelte:head><title>Profile · {tenant.display_name} · LeadKart</title></svelte:head>

{#snippet slug()}
	<span class="cluster cluster-tight">
		<code class="caption text-subtle-foreground">{tenant.slug}</code>
		<CopyButton value={tenant.slug} label="Copy slug" />
	</span>
{/snippet}

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<Badge variant={badge.variant} size="sm">{badge.label}</Badge>
		{#if canImpersonate}
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
			<DescriptionList
				items={[
					{ label: 'GSTIN', value: tenant.gst_number },
					{ label: 'PAN', value: tenant.pan_number },
					{ label: 'Drug licence', value: tenant.drug_licence_number },
					{ label: 'Phone', value: tenant.admin_phone },
					{ label: 'Slug', render: slug }
				]}
			/>
		</Card.Content>
	</Card.Root>
</div>

<ImpersonateModal
	bind:open={impersonateOpen}
	{tenant}
	onOpenChange={(o) => (impersonateOpen = o)}
/>
