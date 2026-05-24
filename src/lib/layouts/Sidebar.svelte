<script lang="ts">
	import { page } from '$app/state';
	import { navForTier } from '$lib/config/nav';
	import { session } from '$features/auth/stores/session.svelte';
	import type { PrincipalTier } from '$features/auth/capabilities';

	let { onNavigate } = $props<{ onNavigate?: () => void }>();

	/**
	 * Active-state matcher — exact match or trailing-slash prefix so
	 * /leads doesn't light up for /leads-archive. Vercel / Linear
	 * pattern.
	 */
	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (path === href) return true;
		return path.startsWith(`${href  }/`);
	}

	/**
	 * Tier-scoped nav catalogue. Tier derives SYNCHRONOUSLY from
	 * session.principal — itself a $derived projection over
	 * page.data.capabilities (SSR-bootstrapped at the root layout
	 * server load). No async query, no skeleton, no first-paint pop-in.
	 *
	 * Items render AS-IS — no permission filtering at the nav layer.
	 * Pages enforce fine-grained perms at action time. Stripe / AWS /
	 * GitHub / Linear / Vercel all do this.
	 */
	const tier = $derived.by((): PrincipalTier => {
		const p = session.principal;
		if (!p) return 'unknown';
		if (p.isPlatform && p.isSuperUser) return 'platform-super';
		if (p.isPlatform) return 'platform-staff';
		if (p.isSuperUser) return 'tenant-admin';
		if (p.permissions?.includes('tenant.admin')) return 'tenant-admin';
		return 'tenant-user';
	});

	const sections = $derived(navForTier(tier));
</script>

<nav class="lk-sidebar glass-card glass-border-glow" aria-label="Main navigation">
	<a href="/dashboard" class="lk-sidebar-brand" aria-label="LeadKart home">
		<span class="lk-sidebar-brand-full" aria-hidden="true">
			<img src="/images/favicon/favicon_512x512.png" alt="LeadKart" class="lk-sidebar-brand-img" />
		</span>
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
							{@const SidebarIcon = item.icon}
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
									<SidebarIcon size={18} aria-hidden="true" />
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
		inset-block-start: max(var(--lk-sidebar-top), var(--safe-top));
		inset-inline-start: max(var(--lk-shell-gap), var(--safe-left));
		block-size: calc(
			100dvh - max(var(--lk-sidebar-top), var(--safe-top)) -
				max(var(--lk-sidebar-bottom), var(--safe-bottom))
		);
		inline-size: var(--lk-sidebar-width);
		color: var(--lk-sidebar-fg);
		display: flex;
		flex-direction: column;
		border: 0;
		border-inline-end: 1px solid var(--lk-sidebar-border);
		border-radius: 0;
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

	:global(:root[data-layout='semibox']) .lk-sidebar {
		border: var(--glass-border);
		border-radius: var(--lk-shell-radius);
	}

	:global([role='dialog']) .lk-sidebar {
		position: relative;
		inset: 0;
		block-size: 100%;
		inline-size: 100%;
		border: 0;
		border-inline-end: 0;
		border-radius: 0;
		box-shadow: none;
		background: var(--lk-sidebar-bg-solid);
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
	}
	:global([role='dialog']) .lk-sidebar::before {
		display: none;
	}

	.lk-sidebar-brand {
		display: flex;
		align-items: center;
		justify-content: center;
		block-size: 5.5rem;
		padding-block: 0.5rem;
		padding-inline: 0.5rem;
		flex-shrink: 0;
		border-block-end: var(--glass-border-subtle);
	}
	.lk-sidebar-brand-full {
		display: flex;
		align-items: center;
		justify-content: center;
		block-size: 100%;
		inline-size: 100%;
		min-inline-size: 0;
	}
	.lk-sidebar-brand-img {
		block-size: 100%;
		inline-size: auto;
		max-inline-size: 100%;
		object-fit: contain;
		display: block;
	}
	.lk-sidebar-brand-mark {
		display: none;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border-radius: 0.5rem;
		object-fit: contain;
		box-shadow: var(--glass-specular);
	}
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

	.lk-sidebar-scroll {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 1rem 0.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
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
		letter-spacing: var(--tracking-body);
		white-space: nowrap;
		transition:
			background 0.18s cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 0.18s cubic-bezier(0.22, 1, 0.36, 1),
			color 0.15s ease-out;
	}
	.lk-sidebar-link :global(svg) {
		flex-shrink: 0;
		color: var(--color-primary);
		transition: color 0.15s;
	}
	.lk-sidebar-link--active :global(svg),
	.lk-sidebar-link:active :global(svg) {
		color: var(--color-primary-active);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-sidebar-link:hover :global(svg) {
			color: var(--color-primary-hover);
		}
	}
	.lk-sidebar-link:focus-visible {
		outline: var(--border-medium) solid var(--color-focus-ring);
		outline-offset: calc(var(--border-medium) * -1);
	}
	.lk-sidebar-link:active,
	.lk-sidebar-link--active {
		background: var(--lk-sidebar-active-bg);
		color: var(--lk-sidebar-active-fg);
		box-shadow:
			var(--lk-sidebar-specular),
			inset 0 0 0 1px var(--lk-sidebar-active-ring);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-sidebar-link:hover {
			background: var(--lk-sidebar-hover-bg);
			color: var(--lk-sidebar-fg);
			box-shadow:
				var(--lk-sidebar-specular),
				inset 0 0 0 1px var(--lk-sidebar-hover-ring);
		}
	}
	@media (pointer: coarse) {
		.lk-sidebar-link {
			min-block-size: var(--lk-touch-target-min);
			padding-block: 0.625rem;
		}
	}

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
	/* Sidebar brand-mark must hide INSIDE a Dialog overlay (e.g. mobile
	   drawer). The dialog is portaled, so the brand-mark class lives in
	   a different DOM tree from the override class. !important is the
	   only mechanism that escapes the cascade in that scenario. */
	:global([role='dialog']) .lk-sidebar-brand-mark {
		/* stylelint-disable-next-line declaration-no-important */
		display: none !important;
	}
</style>
