<script lang="ts">
	import { createDialogState } from '#lib/hooks/index.ts';
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { Badge, Button, Card, DescriptionList } from '$ui';
	import { IdChip } from '#lib/components/data/index.ts';
	import { Eye, Icon } from '$icons';
	import { ImpersonateModal } from '$features/operator/impersonation';
	import { tenantStatus } from '$features/tenant';
	import { P, session } from '$features/auth';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const impersonateDialog = createDialogState();

	const tenant = $derived(data.tenant);
	const canImpersonate = $derived(session.can(P.platformImpersonationManage));
	const badge = $derived(tenantStatus(tenant.status));
</script>

<svelte:head><title>Profile · {plainTitle(tenant.display_name)} · LeadKart</title></svelte:head>

{#snippet slug()}
	<IdChip value={tenant.slug} label="slug" short={false} />
{/snippet}

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<Badge variant={badge.variant} size="sm">{badge.label}</Badge>
		{#if canImpersonate}
			<Button variant="ghost" onclick={() => impersonateDialog.show()}>
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
	bind:open={impersonateDialog.open}
	{tenant}
	onOpenChange={impersonateDialog.onOpenChange}
/>
