<script lang="ts">
	/**
	 * AuthShell — two-column auth layout.
	 *
	 * Left column (desktop only) — solid brand panel:
	 *   - Logo top-left
	 *   - Hero typography (display-2, white)
	 *   - Tagline + feature list
	 *   - Footer copyright bottom-left
	 *   - One ambient radial accent for depth (no decoration competing
	 *     with the type)
	 *
	 * Right column — form panel (slot).
	 * Mobile (< lg) — collapsed brand banner + form panel only.
	 *
	 * Industry refs:
	 *   Stripe Atlas / Linear / Vercel / Cal.com signin pages — solid
	 *   brand surface, bold typography, no photographic illustration
	 *   or decorative badges. B2B SaaS auth canon.
	 *
	 * Accessibility:
	 *   - All theme tokens locked light (auth shell stays in canonical
	 *     light presentation regardless of OS theme — Stripe / Linear
	 *     / Vercel canon).
	 *   - prefers-reduced-transparency falls back to solid surfaces
	 *     (utilities.css fallback).
	 */
	import { Logo } from '$ui';
	import { ShieldCheck, TrendingUp, Truck } from 'lucide-svelte';

	let { children } = $props();
</script>

<div class="lk-auth grid min-h-dvh grid-cols-1 lg:grid-cols-2">
	<!-- Mobile-only compact brand banner. Light brand-50 surface — the
	     logo's natural backdrop. Wordmark + tagline both render in
	     brand-700 (the wordmark navy itself), giving ~10:1 contrast
	     vs the cream-violet bg. No pill chrome needed. -->
	<header
		class="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-brand-50)] px-6 py-4 text-[var(--color-brand-700)] lg:hidden"
	>
		<Logo size="md" />
		<span class="caption font-medium text-[var(--color-brand-700)]">Pharma SaaS</span>
	</header>

	<!-- ═══ BRAND PANEL (desktop only) — solid navy surface with bold
	     typography. No illustration, no decoration. Industry canon for
	     B2B SaaS auth pages (Stripe Atlas / Linear / Vercel / Cal.com).
	     ═══════════════════════════════════════════════════════════════ -->
	<section
		aria-label="LeadKart"
		class="lk-auth-brand relative hidden overflow-hidden lg:flex lg:flex-col"
	>
		<header class="lk-auth-brand-header">
			<Logo size="xl" />
		</header>

		<div class="lk-auth-brand-content">
			<h2 class="display-2 mb-6 leading-[1.1] text-white">
				Pharma lead management,<br />simplified.
			</h2>
			<p class="body-base mb-10 max-w-md text-white/70">
				End-to-end CRM, orders, inventory &amp; dispatch — built for India's PCD pharma market.
			</p>

			<ul class="lk-auth-features">
				<li class="lk-auth-feature">
					<span class="lk-auth-feature-icon" aria-hidden="true">
						<ShieldCheck size={18} />
					</span>
					<span class="body-base text-white/85">Enterprise-grade security</span>
				</li>
				<li class="lk-auth-feature">
					<span class="lk-auth-feature-icon" aria-hidden="true">
						<TrendingUp size={18} />
					</span>
					<span class="body-base text-white/85">Real-time lead tracking</span>
				</li>
				<li class="lk-auth-feature">
					<span class="lk-auth-feature-icon" aria-hidden="true">
						<Truck size={18} />
					</span>
					<span class="body-base text-white/85">Order-to-dispatch pipeline</span>
				</li>
			</ul>
		</div>

		<footer class="lk-auth-brand-footer caption">© LeadKart 2026</footer>
	</section>

	<!-- ═══ FORM PANEL — full-width on mobile, half on desktop.
	     Subtle radial wash provides texture for the glass card's backdrop-
	     filter to actually read as "frosted" — flat bg defeats the effect. -->
	<main class="lk-auth-form-side flex flex-col items-center justify-center p-6 lg:p-12">
		<div class="w-full max-w-md">
			{@render children()}
		</div>
	</main>
</div>

<style>
	/* ── AuthShell-wide THEME LOCK to light values.
	     Both the brand panel AND the form-side stay in a fixed light
	     presentation regardless of `<html class="dark">`. Industry canon:
	     Stripe / Linear / Vercel auth pages don't follow OS theme —
	     they're brand-identity surfaces, always in their canonical
	     light treatment. The form-side is a white "modal" surface; the
	     brand panel is a light-blue marketing surface. AuthCard +
	     headings + links inside both panels inherit the locked tokens.

	     Locked: surface (bg / bg-subtle / bg-elevated), foreground
	     (fg / fg-muted / fg-subtle), borders, semantic brand-heading
	     / brand-link aliases. The brand-* and secondary-* scales never
	     flipped in the first place, so they're not relocked here. ── */
	.lk-auth {
		/* Surface + foreground tokens locked to light values (auth
		   shell stays light in both OS themes — Stripe / Linear /
		   Vercel canon). */
		--color-bg: oklch(0.99 0 0);
		--color-bg-subtle: oklch(0.97 0 0);
		--color-bg-muted: oklch(0.95 0 0);
		--color-bg-elevated: oklch(1 0 0);
		--color-fg: oklch(0.2 0.02 256);
		--color-fg-muted: oklch(0.45 0.02 256);
		--color-fg-subtle: oklch(0.6 0.02 256);
		--color-border: oklch(0.9 0.01 256);
		--color-border-strong: oklch(0.8 0.01 256);

		/* Brand stops 600 + 700 pinned to the EXACT colours per the
		   LeadKart brand spec (user-supplied 2026-05-10 + revised
		   2026-05-11 for the button stop):
		      Sign In button bg + brand-panel accent → #1140b6 ≈ oklch(0.43 0.19 264)
		      Sign In heading                       → #00297d ≈ oklch(0.30 0.20 270)
		   Brand panel uses brand-800 as the solid surface + brand-600
		   as a single ambient radial accent for depth. */
		--color-brand-600: oklch(0.43 0.19 264); /* #1140b6 signin button + ambient accent */
		--color-brand-700: oklch(0.3 0.2 270); /* #00297d signin text */
		--color-brand-800: oklch(0.24 0.16 272); /* brand-panel surface */

		--color-brand-heading: var(--color-brand-700);
		--color-brand-link: var(--color-brand-600);
		--color-brand-link-hover: var(--color-brand-700);
	}

	.lk-auth-form-side {
		/* Pure white in BOTH themes (the AuthShell scope locks
		   bg-elevated to oklch 1 0 0). The AuthCard's border + shadow
		   handle visual separation from this surface. */
		background: var(--color-bg-elevated);
	}

	/* ── Brand panel: solid navy with one ambient radial accent for
	     depth. No illustration, no floats, no glass — just bold
	     typography on an intentional surface. Industry canon for B2B
	     SaaS signin (Stripe Atlas / Linear / Vercel / Cal.com). ── */
	.lk-auth-brand {
		padding: clamp(2.5rem, 5vw, 4rem) clamp(2.5rem, 5vw, 5rem);
		background:
			radial-gradient(
				ellipse 70% 50% at 20% 30%,
				color-mix(in srgb, var(--color-brand-600) 35%, transparent) 0%,
				transparent 65%
			),
			var(--color-brand-800);
		color: var(--color-bg-elevated);
	}

	.lk-auth-brand-header {
		flex-shrink: 0;
	}

	.lk-auth-brand-content {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		max-width: 32.5rem;
		width: 100%;
	}

	.lk-auth-brand-footer {
		flex-shrink: 0;
		opacity: 0.55;
		color: var(--color-bg-elevated);
	}

	/* ── Feature rows — no glass chrome, just an icon chip + white
	     label on the solid surface. Green-accent icon background
	     (logo's inner-K glow tint). ── */
	.lk-auth-features {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}
	.lk-auth-feature {
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}
	.lk-auth-feature-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--color-secondary-500) 22%, transparent);
		color: var(--color-secondary-200);
		flex-shrink: 0;
	}

	/* Force-override the global `.caption { color: var(--color-fg-muted) }`
	   rule (typography.css §caption) inside the brand panel — same
	   specificity, later in cascade order. */
	.lk-auth-brand-footer.caption {
		color: var(--color-bg-elevated);
	}
</style>
