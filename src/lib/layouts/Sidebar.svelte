<script lang="ts">
	import { page } from '$app/state';
	import { navForTier } from '$lib/config/nav';
	import { hasPermission, tierOf } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';

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
	<!-- Brand block — wordmark when expanded, icon mark when collapsed.
	     The wordmark image scales to fill the inner container via
	     object-fit: contain, so the visible artwork stays centred
	     regardless of the PNG asset's internal whitespace. Container
	     gives explicit height so the image has a frame to scale into. -->
	<a href="/dashboard" class="lk-sidebar-brand" aria-label="LeadKart home">
		<span class="lk-sidebar-brand-full" aria-hidden="true">
			<img
				src="/images/logo/LeadKart_Logo_Light_Theme.png"
				alt="LeadKart"
				class="lk-sidebar-brand-img"
			/>
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
	/* ─── Sidebar surface ──────────────────────────────────────────
	   The Sidebar opts OUT of the `.glass-drawer` utility class
	   because its surface tint switches per theme (light → --glass-bg,
	   dark → --glass-bg-dark). It still consumes the SAME tokens
	   (--glass-blur / --glass-saturate / --glass-border-subtle /
	   --glass-specular) as every other glass surface — change a token
	   in tokens.css and the sidebar re-renders alongside the topbar,
	   popovers, dialogs etc. The duplication here is recipe, not
	   values; per-theme tinting is a legitimate component variant. */
	.lk-sidebar {
		position: fixed;
		inset-block-start: max(var(--lk-sidebar-top), var(--safe-top));
		inset-inline-start: max(var(--lk-shell-gap), var(--safe-left));
		block-size: calc(
			100dvh - max(var(--lk-sidebar-top), var(--safe-top)) -
				max(var(--lk-sidebar-bottom), var(--safe-bottom))
		);
		inline-size: var(--lk-sidebar-width);
		background: var(--lk-sidebar-bg-solid);
		color: var(--lk-sidebar-fg);
		border-inline-end: 1px solid var(--lk-sidebar-border);
		box-shadow: var(--lk-sidebar-specular);
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
	@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
		.lk-sidebar {
			background: var(--lk-sidebar-bg);
			-webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))
				brightness(var(--glass-brightness));
			backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))
				brightness(var(--glass-brightness));
		}
	}
	/* Inner gradient overlay — top-light → bottom-darker for the
	   dimensional curvature that distinguishes glass from tinted bg.
	   Same recipe every glass surface uses (utilities.css). */
	.lk-sidebar::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--glass-inner-gradient);
		pointer-events: none;
		z-index: 0;
	}
	.lk-sidebar > * {
		position: relative;
		z-index: 1;
	}

	/* Semibox — sidebar floats; .glass-bordered shape via this rule. */
	:global(:root[data-layout='semibox']) .lk-sidebar {
		border: var(--glass-border);
		border-radius: var(--lk-shell-radius);
		box-shadow: var(--glass-shadow), var(--glass-specular);
	}

	/* Mobile drawer override: render in normal flow with no top-offset
	   or floating border. Background switches to the solid variant —
	   the drawer slides over the overlay which has nothing meaningful
	   to refract, so glass here just looks murky. The drawer is the
	   foreground surface on mobile and benefits from full legibility. */
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

	/* ─── Brand block ──────────────────────────────────────────
	   Height matches --lk-topbar-height so the brand row lines up
	   horizontally with the topbar's bottom edge. Padding-inline
	   matches the nav link's effective inline-offset (scroll-padding
	   0.5rem + link-padding 0.75rem = 1.25rem) so the logo's left edge
	   sits at the same x-coordinate as the nav icons below. */
	.lk-sidebar-brand {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		block-size: var(--lk-topbar-height);
		padding-inline: 1.25rem;
		flex-shrink: 0;
		border-block-end: var(--glass-border-subtle);
	}
	/* Wordmark — fills the full brand block height. The image scales
	   proportionally (object-fit: contain) and anchors to the inline-
	   start edge so it lines up with the nav-link icons below. If the
	   PNG asset has internal whitespace the visible artwork will
	   appear smaller — that's an asset-level concern, not CSS. */
	.lk-sidebar-brand-full {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		block-size: 100%;
		inline-size: 100%;
		min-inline-size: 0;
	}
	.lk-sidebar-brand-img {
		block-size: 100%;
		max-inline-size: 100%;
		inline-size: auto;
		object-fit: contain;
		object-position: left center;
	}
	.lk-sidebar-brand-mark {
		display: none;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border-radius: 0.5rem;
		object-fit: contain;
		box-shadow: var(--glass-specular);
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

	/* ── Scroll region + groups ──────────────────────────────────
	   padding-block-start: 1rem creates breathing room between the
	   brand divider and the first nav item (Apple HIG §"List Spacing"
	   recommends ≥ 16px between dividers and content). Inline-padding
	   0.5rem leaves room for the OS scrollbar without clipping links. */
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

	/* ─── Link ────────────────────────────────────────────────────
	   Default ≥ 36px tall (matches design density on laptops). On
	   coarse pointers (touch screens), bump to 44px (Apple HIG /
	   WCAG 2.5.5 AAA) and widen the rest area so taps don't miss. */
	/* Premium Liquid-Glass pill — composed of FOUR visual layers
	   activated on hover/active:
	     1. Background fill   — semi-transparent white (or brand-tinted
	                            for active) via --lk-sidebar-{hover,
	                            active}-bg
	     2. Inset top specular — catches "light from above" (white edge
	                            highlight on the rounded top inside)
	     3. Inset hairline ring — 1px alpha border tracing the pill's
	                            interior — gives it crisp glass edges
	                            without competing with the parent
	                            sidebar's border
	     4. Soft outer drop    — 1px tinted shadow grounds the pill
	                            against the sidebar surface so it
	                            feels physically lifted
	   At rest, all four shadow layers collapse to `none` — the link
	   is invisible chrome. Spring-eased transition (180ms) for the
	   premium "snap" feel. Apple Music sidebar / Finder canon. */
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
			background 0.18s cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 0.18s cubic-bezier(0.22, 1, 0.36, 1),
			color 0.15s ease-out;
	}
	/* Brand-tinted icon stroke — single --color-primary token, state
	   variants via the primary-hover/-active state-layer tokens. The
	   dark-sidebar variant tones this down (handled below) since
	   primary over the dark glass tint loses contrast. */
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
	/* Dark sidebar — keep icons in the muted-fg neutral so they read
	   over the dark glass tint without losing legibility. */
	:global(:root[data-sidebar-colors='dark']) .lk-sidebar-link :global(svg) {
		color: var(--lk-sidebar-fg-muted);
	}
	:global(:root[data-sidebar-colors='dark']) .lk-sidebar-link--active :global(svg),
	:global(:root[data-sidebar-colors='dark']) .lk-sidebar-link:active :global(svg) {
		color: var(--lk-sidebar-active-fg);
	}
	/* Inset focus ring — the link has its own glass-pill background
	   when focused/hovered, so the outline sits INSIDE the pill edge
	   rather than offsetting outward (which would clip into adjacent
	   links). Inset offset is a legitimate override of the global. */
	.lk-sidebar-link:focus-visible {
		outline: var(--border-medium) solid var(--color-focus-ring);
		outline-offset: calc(var(--border-medium) * -1);
	}
	/* Active (committed): brand-tinted glass pill — inset ring +
	   specular only, NO outer drop-shadow. iOS Music selected-row
	   canon: the row is embedded in the chrome, not floating above. */
	.lk-sidebar-link:active,
	.lk-sidebar-link--active {
		background: var(--lk-sidebar-active-bg);
		color: var(--lk-sidebar-active-fg);
		box-shadow:
			var(--lk-sidebar-specular),
			inset 0 0 0 1px var(--lk-sidebar-active-ring);
	}
	/* Hover (ambient lift): SUBTLE darken pill — inset ring + specular
	   only, NO outer drop. iOS Mail/Music sidebar hover canon. */
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
