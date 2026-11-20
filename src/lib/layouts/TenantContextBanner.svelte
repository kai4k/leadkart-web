<script lang="ts">
	/**
	 * "You are acting in <company>" for an operator inside a tenant context, with the one Exit control.
	 * The text comes from the COMMITTED page data (`page.data.tenantContext`, set by the (app) layout
	 * load from the signed scope cookie): never from a store a preload could change. Exit is the
	 * existing flow (`exitScopeMutation`: cookie, cache, layout reload, navigate to the tenants list).
	 */
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { Badge, Button } from '$ui';
	import { Building2, Icon, LogOut } from '$icons';
	import { exitScopeMutation } from '$features/operator/scope';
	import { resetPending } from '#lib/api/hard-reset.ts';
	import ContextBanner from './ContextBanner.svelte';
	import EntityName from './EntityName.svelte';

	const context = $derived(
		(page.data as { tenantContext?: { displayName: string; isPlatform: boolean } | null })
			.tenantContext ?? null
	);
	const exit = exitScopeMutation();
	// a reset can start between the last render and this click (`resetPending` is not reactive)
	function exitNow(): void {
		if (!resetPending()) exit.mutate();
	}
</script>

{#if context}
	<ContextBanner tone="warning" icon={Building2} label={$_('shell.tenantContext.region')}>
		<span class="font-medium">
			<EntityName messageKey="shell.tenantContext.actingIn" name={context.displayName} />
		</span>
		{#if context.isPlatform}
			<Badge variant="brand" size="sm" class="ms-2">{$_('shell.tenantContext.platform')}</Badge>
		{/if}
		{#snippet action({ stale })}
			<Button
				variant="outline"
				size="sm"
				loading={exit.isPending}
				aria-disabled={stale ? 'true' : undefined}
				onclick={stale ? undefined : exitNow}
			>
				<Icon icon={LogOut} size="sm" />
				{$_('shell.tenantContext.exit')}
			</Button>
		{/snippet}
	</ContextBanner>
{/if}
