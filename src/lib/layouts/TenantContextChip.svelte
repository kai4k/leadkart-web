<script lang="ts">
	/**
	 * TenantContextChip — renders when the operator is viewing a
	 * specific tenant's context (/operator/tenants/[slug]/...).
	 *
	 * Shows "Operator › <Tenant Name>" as a glass-pill breadcrumb in
	 * the topbar. Clicking navigates back to /operator/tenants.
	 *
	 * V1: link-back only. Full Cmd+K tenant picker is a Phase B
	 * enhancement (noted in the spec).
	 */
	import { Building2, ChevronRight, Shield, Icon } from '$icons';
	import { tenantDetailQuery } from '$features/operator/tenants/queries';

	let { slug }: { slug: string } = $props();

	// $props() values are reactive — use them directly in $derived.
	const query = $derived(tenantDetailQuery(slug));
	const tenant = $derived(query.data ?? null);
	const isPlatform = $derived(tenant?.slug === 'platform');
	const displayName = $derived(tenant?.display_name ?? slug);
</script>

<a
	href="/operator/tenants"
	class="lk-tenant-chip glass-pill"
	aria-label="Exit tenant context — back to tenant list"
	title="Back to all tenants"
>
	<span class="lk-tenant-chip-label">Operator</span>
	<Icon icon={ChevronRight} size="xs" class="lk-tenant-chip-sep" />
	<Icon icon={isPlatform ? Shield : Building2} size="xs" class="lk-tenant-chip-icon" />
	<span class="lk-tenant-chip-name">{displayName}</span>
</a>

<style>
	.lk-tenant-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding-inline: 0.625rem;
		padding-block: 0.3125rem;
		font-size: var(--text-xs);
		font-weight: 500;
		letter-spacing: var(--tracking-caption);
		color: var(--color-fg-muted);
		white-space: nowrap;
		max-inline-size: 18rem;
		overflow: hidden;
		text-overflow: ellipsis;
		transition:
			color 0.15s,
			background 0.15s;
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-tenant-chip:hover {
			color: var(--color-fg);
		}
	}
	.lk-tenant-chip-name {
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--color-fg);
	}
	.lk-tenant-chip :global(.lk-tenant-chip-icon) {
		color: var(--color-primary);
		flex-shrink: 0;
	}
	.lk-tenant-chip :global(.lk-tenant-chip-sep) {
		color: var(--color-fg-subtle);
		flex-shrink: 0;
	}
</style>
