<script lang="ts">
	import { Button, Card } from '$ui';
	import { Pause, Play, Icon } from '$icons';
	import { canSuspend, canActivate } from '../view-models';
	import { activateTenantMutation } from '../queries';
	import { P, session } from '$features/auth';
	import type { TenantDto } from '../types';

	type Props = {
		tenant: TenantDto;
		onSuspend: (tenant: TenantDto) => void;
	};

	let { tenant, onSuspend }: Props = $props();

	// One Go permission per lifecycle action (suspend, activate).
	const maySuspend = $derived(session.can(P.identityTenantsSuspend));
	const mayActivate = $derived(session.can(P.identityTenantsActivate));
	const canManage = $derived(maySuspend || mayActivate);
	/** Platform tenant is immutable — backend rejects lifecycle mutations via
	 *  ensureNotPlatformTenant. Hide the buttons rather than let them 422. */
	const isPlatformTenant = $derived(tenant.slug === 'platform');

	const activateMutation = activateTenantMutation();

	const isPending = $derived(activateMutation.isPending);

	async function activate() {
		activateMutation.mutate(tenant.id);
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Lifecycle</Card.Title>
		<Card.Description
			>{canManage
				? 'Operator-tier mutations on this tenant.'
				: "Read-only — you cannot change this tenant's lifecycle."}</Card.Description
		>
	</Card.Header>
	<Card.Content class="cluster">
		{#if isPlatformTenant}
			<p class="caption text-muted-foreground">
				Lifecycle mutations are locked for the platform tenant.
			</p>
		{:else}
			{#if maySuspend && canSuspend(tenant)}
				<Button variant="ghost" onclick={() => onSuspend(tenant)} disabled={isPending}>
					<Icon icon={Pause} size="sm" /> Suspend
				</Button>
			{/if}
			{#if mayActivate && canActivate(tenant)}
				<Button variant="ghost" onclick={activate} loading={isPending}>
					<Icon icon={Play} size="sm" /> Activate
				</Button>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
