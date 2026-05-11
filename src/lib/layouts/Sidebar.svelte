<script lang="ts">
	import { page } from '$app/state';
	import { navForTier } from '$lib/config/nav';
	import { hasPermission, tierOf } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';

	let { onNavigate } = $props<{ onNavigate?: () => void }>();

	/**
	 * Active-state matcher — top-level routes use exact match; nested
	 * use startsWith with a trailing-slash boundary so /leads doesn't
	 * also light up for /leads-archive. Industry-standard pattern (Vercel
	 * dashboard, Linear sidebar).
	 */
	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (path === href) return true;
		return path.startsWith(href + '/');
	}

	/**
	 * Tier-scoped nav catalogue + per-item permission filter.
	 *
	 *   1. tier (platform-super / platform-staff / tenant-admin /
	 *      tenant-user) picks the catalogue from nav.ts.
	 *   2. Each item's `requires` permission is checked against the
	 *      principal's JWT claims via `hasPermission`; SuperUser
	 *      short-circuits everything.
	 *   3. Sections with no items left after filtering disappear
	 *      from the rendered tree.
	 *
	 * Re-derives reactively on signin / refresh — `session.principal`
	 * is a $state-backed reactive ref.
	 */
	const sections = $derived.by(() => {
		const principal = session.principal;
		const catalogue = navForTier(tierOf(principal));
		return catalogue
			.map((section) => ({
				...section,
				items: section.items.filter(
					(item) => item.requires === null || hasPermission(principal, item.requires)
				)
			}))
			.filter((section) => section.items.length > 0);
	});
</script>

<nav class="lk-sidebar flex h-full flex-col" aria-label="Main navigation">
	<div class="stack stack-relaxed flex-1 overflow-y-auto p-3">
		{#each sections as section, i (section.title ?? i)}
			{#if section.items.length > 0}
				<div class="stack stack-tight">
					{#if section.title}
						<p class="lk-sidebar-section-title px-3 pb-1 overline">{section.title}</p>
					{/if}
					<ul class="stack stack-tight">
						{#each section.items as item (item.href)}
							{@const Icon = item.icon}
							{@const active = isActive(item.href)}
							<li>
								<a
									href={item.href}
									aria-current={active ? 'page' : undefined}
									aria-label={item.label}
									onclick={() => onNavigate?.()}
									title={item.label}
									class={[
										'lk-sidebar-link body-sm flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors',
										active && 'lk-sidebar-link--active'
									]}
								>
									<Icon size={18} aria-hidden="true" />
									<span class="lk-sidebar-label">{item.label}</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/each}
	</div>
</nav>

<style>
	.lk-sidebar {
		width: var(--lk-sidebar-width);
		background: var(--lk-sidebar-bg);
		color: var(--lk-sidebar-fg);
		border-inline-end: 1px solid var(--lk-sidebar-border);
		transition:
			width 0.2s ease-out,
			background 0.2s ease-out;
	}
	.lk-sidebar-section-title {
		display: var(--lk-sidebar-section-title-display);
		color: var(--lk-sidebar-fg-muted);
	}
	.lk-sidebar-label {
		display: var(--lk-sidebar-label-display);
	}
	.lk-sidebar-link {
		color: var(--lk-sidebar-fg);
	}
	.lk-sidebar-link:hover {
		background: var(--lk-sidebar-hover-bg);
	}
	.lk-sidebar-link--active {
		background: var(--lk-sidebar-active-bg);
		color: var(--lk-sidebar-active-fg);
	}
</style>
