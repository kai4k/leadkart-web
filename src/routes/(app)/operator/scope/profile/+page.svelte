<script lang="ts">
	import { createDialogState } from '#lib/hooks/index.ts';
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { Badge, Button, Card, DescriptionList } from '#lib/components/ui/index.ts';
	import { IdChip } from '#lib/components/data/index.ts';
	import { Eye, Icon } from '#lib/icons/index.ts';
	import { ImpersonateModal } from '#lib/features/operator/impersonation/index.ts';
	import { isPlatformTenant, tenantStatus } from '#lib/features/tenant/index.ts';
	import { P, session } from '#lib/features/auth/index.ts';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const impersonateDialog = createDialogState();

	const tenant = $derived(data.tenant);
	// Go refuses a session into LeadKart's own tenant (422 impersonation_invalid): no action offered.
	const canImpersonate = $derived(
		session.can(P.platformImpersonationManage) && !isPlatformTenant(tenant)
	);
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
