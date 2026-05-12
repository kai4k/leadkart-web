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
										'lk-sidebar-link rounded-md font-medium transition-colors',
										active && 'lk-sidebar-link--active'
									]}
								>
									<Icon aria-hidden="true" />
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
		position: fixed;
		inset-block-start: calc(var(--lk-topbar-height) + var(--lk-shell-gap));
		inset-inline-start: var(--lk-shell-gap);
		block-size: calc(100dvh - var(--lk-topbar-height) - var(--lk-shell-gap) * 2);
		inline-size: var(--lk-sidebar-width);
		background: var(--lk-sidebar-bg);
		color: var(--lk-sidebar-fg);
		border-inline-end: 1px solid var(--lk-sidebar-border);
		border-end-start-radius: var(--lk-shell-radius);
		box-shadow: var(--lk-shell-shadow);
		transition:
			inline-size 0.2s ease-out,
			inset-block-start 0.2s ease-out,
			inset-inline-start 0.2s ease-out,
			block-size 0.2s ease-out,
			border-radius 0.2s ease-out,
			background 0.2s ease-out;
		z-index: var(--z-sticky);
	}
	/* Inside the mobile drawer, anchor at top (no Topbar/gap offset). */
	:global([role='dialog']) .lk-sidebar {
		position: relative;
		inset: 0;
		block-size: 100%;
		border-radius: 0;
		box-shadow: none;
	}
	.lk-sidebar-section-title {
		display: var(--lk-sidebar-section-title-display);
		color: var(--lk-sidebar-fg-muted);
	}
	.lk-sidebar-label {
		display: var(--lk-sidebar-label-display);
		font-size: var(--lk-sidebar-label-size);
		line-height: 1.2;
	}
	.lk-sidebar-link {
		display: flex;
		flex-direction: var(--lk-sidebar-link-direction);
		align-items: var(--lk-sidebar-link-align);
		justify-content: var(--lk-sidebar-link-align);
		text-align: var(--lk-sidebar-link-text-align);
		gap: var(--lk-sidebar-link-gap);
		padding: var(--lk-sidebar-link-padding);
		color: var(--lk-sidebar-fg);
		transition:
			background 0.15s,
			color 0.15s,
			padding 0.2s ease-out,
			gap 0.2s ease-out;
	}
	.lk-sidebar-link :global(svg) {
		width: var(--lk-sidebar-icon-size);
		height: var(--lk-sidebar-icon-size);
		flex-shrink: 0;
	}
	.lk-sidebar-link:hover {
		background: var(--lk-sidebar-hover-bg);
	}
	.lk-sidebar-link--active {
		background: var(--lk-sidebar-active-bg);
		color: var(--lk-sidebar-active-fg);
	}
</style>
