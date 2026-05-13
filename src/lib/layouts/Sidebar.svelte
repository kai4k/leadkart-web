<script lang="ts">
	import { page } from '$app/state';
	import { navForTier } from '$lib/config/nav';
	import { hasPermission, tierOf } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';
	import { Logo } from '$ui';

	let { onNavigate } = $props<{ onNavigate?: () => void }>();

	/**
	 * Active-state matcher — exact match or trailing-slash prefix so
	 * /leads doesn't light up for /leads-archive. Vercel / Linear
	 * pattern.
	 */
	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (path === href) return true;
		return path.startsWith(href + '/');
	}

	/**
	 * Tier-scoped nav catalogue + per-item permission filter.
	 * SuperUser short-circuits everything via hasPermission. Sections
	 * with no items left after filtering disappear from the rendered
	 * tree.
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

<nav class="lk-sidebar" aria-label="Main navigation">
	<!-- Logo block — full wordmark when expanded, icon-only when collapsed.
	     Sidebar is the single home of the brand mark (Linear / Vercel:
	     logo lives in the sidebar, not the topbar). -->
	<a href="/dashboard" class="lk-sidebar-brand" aria-label="LeadKart home">
		<Logo size="md" class="lk-sidebar-brand-full" />
		<img
			src="/images/favicon/favicon_128x128.png"
			alt=""
			class="lk-sidebar-brand-mark"
			aria-hidden="true"
		/>
	</a>

	<div class="lk-sidebar-scroll">
		{#each sections as section, i (section.title ?? i)}
			{#if section.items.length > 0}
				<div class="lk-sidebar-group">
					{#if section.title}
						<p class="lk-sidebar-section-title overline">{section.title}</p>
					{/if}
					<ul class="lk-sidebar-list">
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
									class={['lk-sidebar-link', active && 'lk-sidebar-link--active']}
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
	/* ─── Sidebar surface ─────────────────────────────────────────
	   Position-fixed column to the inline-start. Safe-area max() on
	   block-start + inline-start guards against notched / curved
	   devices in landscape. `contain: layout style` scopes reflow. */
	.lk-sidebar {
		position: fixed;
		inset-block-start: max(var(--lk-sidebar-top), var(--safe-top));
		inset-inline-start: max(var(--lk-shell-gap), var(--safe-left));
		block-size: calc(
			100dvh - max(var(--lk-sidebar-top), var(--safe-top)) -
				max(var(--lk-sidebar-bottom), var(--safe-bottom))
		);
		inline-size: var(--lk-sidebar-width);
		background: var(--lk-sidebar-bg);
		color: var(--lk-sidebar-fg);
		border-inline-end: 1px solid var(--lk-sidebar-border);
		display: flex;
		flex-direction: column;
		contain: layout style;
		transition:
			inline-size 0.18s ease-out,
			inset-block-start 0.18s ease-out,
			inset-inline-start 0.18s ease-out,
			block-size 0.18s ease-out,
			border-radius 0.18s ease-out,
			background 0.15s ease-out;
		z-index: var(--z-sticky);
	}

	/* Semibox — sidebar floats with a full border + radius + shadow. */
	:global(:root[data-layout='semibox']) .lk-sidebar {
		border: 1px solid var(--lk-sidebar-border);
		border-radius: var(--lk-shell-radius);
		box-shadow: var(--lk-shell-shadow);
	}

	/* Mobile drawer override: render in normal flow with no top-offset
	   or floating border (the drawer's own panel handles the visual). */
	:global([role='dialog']) .lk-sidebar {
		position: relative;
		inset: 0;
		block-size: 100%;
		inline-size: 100%;
		border: 0;
		border-inline-end: 0;
		border-radius: 0;
		box-shadow: none;
	}

	/* ── Brand block ───────────────────────────────────────────── */
	.lk-sidebar-brand {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		block-size: 3.25rem;
		padding-inline: 0.875rem;
		flex-shrink: 0;
	}
	.lk-sidebar-brand-mark {
		display: none;
		inline-size: 1.75rem;
		block-size: 1.75rem;
		border-radius: 0.375rem;
	}
	/* Collapsed: hide wordmark, show mark + center it. Drawer always
	   uses the full wordmark. */
	:global(:root[data-sidebar-collapsed]) .lk-sidebar-brand {
		justify-content: center;
		padding-inline: 0.5rem;
	}
	:global(:root[data-sidebar-collapsed]) .lk-sidebar-brand :global(.lk-sidebar-brand-full) {
		display: none;
	}
	:global(:root[data-sidebar-collapsed]) .lk-sidebar-brand-mark {
		display: block;
	}

	/* ── Scroll region + groups ────────────────────────────────── */
	.lk-sidebar-scroll {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0.5rem 0.5rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.lk-sidebar-group {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}
	.lk-sidebar-section-title {
		display: block;
		padding-inline: 0.75rem;
		padding-block-end: 0.25rem;
		color: var(--lk-sidebar-fg-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.lk-sidebar-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	/* ─── Link ────────────────────────────────────────────────────
	   Default ≥ 36px tall (matches design density on laptops). On
	   coarse pointers (touch screens), bump to 44px (Apple HIG /
	   WCAG 2.5.5 AAA) and widen the rest area so taps don't miss. */
	.lk-sidebar-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		min-block-size: 2.25rem;
		border-radius: 0.5rem;
		color: var(--lk-sidebar-fg);
		font-size: var(--text-sm);
		font-weight: 500;
		white-space: nowrap;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.lk-sidebar-link :global(svg) {
		flex-shrink: 0;
	}
	.lk-sidebar-link:focus-visible {
		outline: 2px solid var(--color-brand-500);
		outline-offset: -2px;
	}
	.lk-sidebar-link:active {
		background: var(--lk-sidebar-active-bg);
	}
	.lk-sidebar-link--active {
		background: var(--lk-sidebar-active-bg);
		color: var(--lk-sidebar-active-fg);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-sidebar-link:hover {
			background: var(--lk-sidebar-hover-bg);
			color: var(--lk-sidebar-fg);
		}
	}
	@media (pointer: coarse) {
		.lk-sidebar-link {
			min-block-size: var(--lk-touch-target-min);
			padding-block: 0.625rem;
		}
	}

	/* Collapsed: hide labels + section titles, center icons. The native
	   `title` attribute on each link provides the OS tooltip. */
	:global(:root[data-sidebar-collapsed]) .lk-sidebar-label {
		display: none;
	}
	:global(:root[data-sidebar-collapsed]) .lk-sidebar-section-title {
		visibility: hidden;
		block-size: 0.25rem;
		padding: 0;
	}
	:global(:root[data-sidebar-collapsed]) .lk-sidebar-link {
		justify-content: center;
		padding-inline: 0.5rem;
	}
	/* Drawer (mobile): always show labels even if root is marked
	   collapsed — the collapsed state is desktop-only. */
	:global([role='dialog']) .lk-sidebar-label {
		display: inline;
	}
	:global([role='dialog']) .lk-sidebar-section-title {
		visibility: visible;
		block-size: auto;
		padding-block-end: 0.25rem;
	}
	:global([role='dialog']) .lk-sidebar-link {
		justify-content: flex-start;
		padding-inline: 0.75rem;
	}
	:global([role='dialog']) .lk-sidebar-brand-mark {
		display: none !important;
	}
</style>
