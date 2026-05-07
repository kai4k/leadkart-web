<script lang="ts">
	import { Alert, Card, Spinner } from '$ui';
	import TenantProfileForm from '$features/tenant/components/TenantProfileForm.svelte';
	import { tenant } from '$features/tenant/stores/tenant.svelte';
	import { tenantDisplayName, tenantStatusBadge } from '$features/tenant/view-models';

	/**
	 * Tenant Settings page — composes the feature's components against
	 * the tenant store. Status drives the UI: idle/loading → Spinner;
	 * error → Alert with retry; ready → header + form sections.
	 *
	 * Loads on first $effect run. The `idle` guard keeps the call
	 * single-shot — re-renders triggered by `tenant.status` itself
	 * never re-fetch (status transitions away from idle after the
	 * first call).
	 *
	 * Future commits add Statutory / Contact / Display Preferences
	 * forms. When the second form lands, lift the inline status pill
	 * into a Badge primitive (Rule of Three trigger).
	 */

	$effect(() => {
		if (tenant.status === 'idle') {
			tenant.load().catch(() => {
				// Store has already transitioned to 'error'; UI handles.
			});
		}
	});

	const badge = $derived(tenant.current ? tenantStatusBadge(tenant.current.status) : null);
</script>

<svelte:head>
	<title>Tenant Settings · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	{#if tenant.status === 'idle' || tenant.status === 'loading'}
		<div class="flex justify-center py-16">
			<Spinner size={32} />
		</div>
	{:else if tenant.status === 'error'}
		<Alert variant="danger" title="Could not load tenant settings">
			Refresh the page or try again in a moment. If the problem persists, contact support.
		</Alert>
	{:else if tenant.current && badge}
		<header class="stack stack-tight">
			<div class="cluster">
				<h1 class="h1">{tenantDisplayName(tenant.current)}</h1>
				<span
					class={'caption inline-flex items-center rounded-full px-2 py-0.5 font-medium ' +
						(badge.variant === 'success'
							? 'bg-[var(--color-success-50)] text-[var(--color-success-900)] dark:bg-[var(--color-success-900)] dark:text-[var(--color-success-50)]'
							: badge.variant === 'warning'
								? 'bg-[var(--color-warning-50)] text-[var(--color-warning-900)] dark:bg-[var(--color-warning-900)] dark:text-[var(--color-warning-50)]'
								: badge.variant === 'danger'
									? 'bg-[var(--color-danger-50)] text-[var(--color-danger-900)] dark:bg-[var(--color-danger-900)] dark:text-[var(--color-danger-50)]'
									: 'bg-[var(--color-info-50)] text-[var(--color-info-900)] dark:bg-[var(--color-info-900)] dark:text-[var(--color-info-50)]')}
				>
					{badge.label}
				</span>
			</div>
			<p class="body-sm text-[var(--color-fg-muted)]">
				Manage your organisation's profile, statutory IDs, contact details, and platform
				preferences.
			</p>
		</header>

		<Card.Root>
			<Card.Header>
				<Card.Title>Profile</Card.Title>
				<Card.Description>
					The legal entity name and the friendly display name shown across the LeadKart UI and on
					outbound communications.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<TenantProfileForm tenant={tenant.current} />
			</Card.Content>
		</Card.Root>
	{/if}
</div>
