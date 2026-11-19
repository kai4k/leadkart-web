<script lang="ts">
	import { Button, Card } from '$ui';
	import { Pause, Play, Trash2, RotateCcw, Icon } from '$icons';
	import { canSuspend, canActivate, canMarkForDeletion, canRestore } from '../view-models';
	import { activateTenantMutation, restoreTenantMutation } from '../queries';
	import { P, session } from '$features/auth';
	import type { TenantDto } from '../types';

	type Props = {
		tenant: TenantDto;
		onAction: (action: 'suspend' | 'mark', tenant: TenantDto) => void;
	};

	let { tenant, onAction }: Props = $props();

	// One Go permission per lifecycle action (suspend / activate / delete = mark + restore).
	const maySuspend = $derived(session.can(P.identityTenantsSuspend));
	const mayActivate = $derived(session.can(P.identityTenantsActivate));
	const mayDelete = $derived(session.can(P.identityTenantsDelete));
	const canManage = $derived(maySuspend || mayActivate || mayDelete);
	/** Platform tenant is immutable — backend rejects lifecycle mutations via
	 *  ensureNotPlatformTenant. Hide the buttons rather than let them 422. */
	const isPlatformTenant = $derived(tenant.slug === 'platform');

	const activateMutation = activateTenantMutation();
	const restoreMutation = restoreTenantMutation();

	const isPending = $derived(activateMutation.isPending || restoreMutation.isPending);

	async function activate() {
		activateMutation.mutate(tenant.id);
	}
	async function restore() {
		restoreMutation.mutate(tenant.id);
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
			<p class="caption text-fg-muted">Lifecycle mutations are locked for the platform tenant.</p>
		{:else}
			{#if maySuspend && canSuspend(tenant)}
				<Button variant="ghost" onclick={() => onAction('suspend', tenant)} disabled={isPending}>
					<Icon icon={Pause} size="sm" /> Suspend
				</Button>
			{/if}
			{#if mayActivate && canActivate(tenant)}
				<Button variant="ghost" onclick={activate} loading={isPending}>
					<Icon icon={Play} size="sm" /> Activate
				</Button>
			{/if}
			{#if mayDelete && canMarkForDeletion(tenant)}
				<Button variant="danger" onclick={() => onAction('mark', tenant)} disabled={isPending}>
					<Icon icon={Trash2} size="sm" /> Mark for deletion
				</Button>
			{/if}
			{#if mayDelete && canRestore(tenant)}
				<Button variant="ghost" onclick={restore} loading={isPending}>
					<Icon icon={RotateCcw} size="sm" /> Restore
				</Button>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
