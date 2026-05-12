<script lang="ts">
	import { page } from '$app/state';
	import { navForTier } from '$lib/config/nav';
	import { hasPermission, tierOf } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';

	/**
	 * HorizontalNav — top-level horizontal menu strip rendered only when
	 * layoutMode='horizontal'. Mirrors Domiex's behaviour where the
	 * sidebar transforms into a horizontal nav row beneath the topbar.
	 *
	 * Renders the same tier-scoped + permission-filtered nav data as
	 * Sidebar.svelte, but as a single horizontal row of items (section
	 * titles are dropped — sections become natural visual groups via
	 * spacing). Overflow on narrow screens scrolls horizontally.
	 *
	 * Position: fixed, anchored directly below the Topbar (top =
	 * topbar-height + shell-gap). Height drives --lk-horizontal-nav-
	 * height so the page-wrapper offsets itself.
	 */

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (path === href) return true;
		return path.startsWith(href + '/');
	}

	const items = $derived.by(() => {
		const principal = session.principal;
		const catalogue = navForTier(tierOf(principal));
		return catalogue.flatMap((section) =>
			section.items.filter(
				(item) => item.requires === null || hasPermission(principal, item.requires)
			)
		);
	});
</script>

<nav class="lk-hnav" aria-label="Horizontal navigation">
	<ul class="lk-hnav-list">
		{#each items as item (item.href)}
			{@const Icon = item.icon}
			{@const active = isActive(item.href)}
			<li>
				<a
					href={item.href}
					aria-current={active ? 'page' : undefined}
					class={['lk-hnav-link', active && 'lk-hnav-link--active']}
				>
					<Icon size={16} aria-hidden="true" />
					<span>{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.lk-hnav {
		position: fixed;
		inset-block-start: calc(var(--lk-topbar-height) + var(--lk-shell-gap));
		inset-inline: var(--lk-shell-gap);
		z-index: calc(var(--z-sticky) - 1);
		block-size: var(--lk-horizontal-nav-height);
		background: var(--color-bg-elevated);
		border-block-end: 1px solid var(--color-border);
		box-shadow: var(--lk-shell-shadow);
		overflow-x: auto;
		overflow-y: hidden;
		scrollbar-width: thin;
		transition:
			inset-block-start 0.2s ease-out,
			inset-inline 0.2s ease-out;
	}
	.lk-hnav-list {
		display: flex;
		align-items: center;
		gap: 0.125rem;
		block-size: 100%;
		padding-inline: clamp(0.5rem, 2vw, 1.25rem);
		margin: 0;
		list-style: none;
		white-space: nowrap;
	}
	.lk-hnav-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding-inline: 0.875rem;
		padding-block: 0.5rem;
		border-radius: 0.375rem;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
		transition:
			background 0.15s,
			color 0.15s;
	}
	.lk-hnav-link:hover {
		background: var(--color-bg-muted);
		color: var(--color-fg);
	}
	.lk-hnav-link--active {
		background: var(--color-brand-50);
		color: var(--color-brand-700);
	}
	.lk-hnav-link:focus-visible {
		outline: 2px solid var(--color-brand-500);
		outline-offset: 2px;
	}
</style>
