<script lang="ts">
	/**
	 * AuthShell — two-column auth layout porting the Blazor `AuthLayout`
	 * (LeadKart.Web.Client/Components/Pages/Auth/Login.razor + Login.razor.css).
	 *
	 * Left column (desktop only) — animated brand panel:
	 *   - Hero glass pill: "Pharma Lead Management, Simplified."
	 *   - Tagline glass pill
	 *   - 3 feature glass pills (security / lead tracking / dispatch)
	 *   - Product illustration (radial-mask-faded, scoped opacity)
	 *   - 5 floating product-themed glass cards (vertical bobbing animation)
	 *   - Mouse-driven parallax on the brand-content / illustration / floats
	 *   - Background radial glow
	 *
	 * Right column — form panel (slot).
	 * Mobile (< lg) — collapsed brand banner + form panel only.
	 *
	 * Animation system:
	 *   - `lk-float-bob` keyframes: 6-8s vertical translate loop, staggered
	 *     start delays so the 5 cards feel organic, not synchronised.
	 *   - Mouse parallax: `mousemove` on the brand panel writes
	 *     --mouse-x / --mouse-y onto its CSS scope; `.lk-parallax-{slow,
	 *     medium,fast,reverse}` consume those vars in transform: translate.
	 *     Throttled via requestAnimationFrame; cleaned up on unmount.
	 *   - Card entrance + border-glow: keyframes in animations.css scoped
	 *     to .lk-login-card.
	 *
	 * Industry refs:
	 *   - Apple HIG "Animation" (parallax driven by physical/cursor input)
	 *   - Material 3 hero parallax patterns
	 *   - Stripe Atlas marketing pages (mouse-driven brand-side parallax)
	 *   - Dribbble + Layers design library "auth pages with personality"
	 *
	 * Accessibility:
	 *   - prefers-reduced-motion gates ALL animations (handled globally
	 *     in base.css §reduce-motion + the parallax effect bails on the
	 *     same media query).
	 *   - Floats are aria-hidden — purely decorative.
	 *   - The illustration is aria-hidden + alt="" — text content carries
	 *     the brand message (hero pill).
	 *   - prefers-reduced-transparency falls back to solid surfaces
	 *     (utilities.css fallback).
	 */
	import { onMount } from 'svelte';
	import { Logo } from '$ui';
	import { ShieldCheck, TrendingUp, Truck, ShoppingCart, Package, LineChart } from 'lucide-svelte';

	let { children } = $props();

	let brandPanel: HTMLElement | undefined = $state();

	onMount(() => {
		if (!brandPanel) return;

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		if (reducedMotion.matches) return;

		let raf = 0;
		let pendingX = 0;
		let pendingY = 0;

		function onMove(e: MouseEvent) {
			if (!brandPanel) return;
			const rect = brandPanel.getBoundingClientRect();
			// Normalise to [-1, 1] from the panel centre — the parallax CSS
			// then multiplies by per-layer rem amounts.
			pendingX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
			pendingY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
			if (!raf) raf = requestAnimationFrame(commit);
		}

		function commit() {
			raf = 0;
			brandPanel?.style.setProperty('--mouse-x', String(pendingX));
			brandPanel?.style.setProperty('--mouse-y', String(pendingY));
		}

		function onLeave() {
			pendingX = 0;
			pendingY = 0;
			if (!raf) raf = requestAnimationFrame(commit);
		}

		brandPanel.addEventListener('mousemove', onMove);
		brandPanel.addEventListener('mouseleave', onLeave);

		return () => {
			brandPanel?.removeEventListener('mousemove', onMove);
			brandPanel?.removeEventListener('mouseleave', onLeave);
			if (raf) cancelAnimationFrame(raf);
		};
	});
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

	<!-- ═══ BRAND PANEL (desktop only) — split 50/50: image on top,
	     solid-navy text block on bottom. Industry canon for product
	     auth pages (Linear / Notion): image stays purely decorative,
	     text lives on an intentional solid surface with strong
	     contrast — no glass-pill chrome competing with photographic
	     content. ═══════════════════════════════════════════════════ -->
	<section
		bind:this={brandPanel}
		aria-label="LeadKart"
		class="lk-auth-brand relative hidden overflow-hidden lg:flex lg:flex-col"
	>
		<!-- ── TOP HALF: image canvas ── -->
		<div class="lk-auth-brand-image">
			<div class="lk-auth-illustration lk-parallax-medium" aria-hidden="true">
				<img src="/images/auth/illustration.png" alt="" class="lk-auth-illustration-img" />
			</div>

			<!-- Page-level logo — bare, top-left of the image area. -->
			<div class="lk-auth-page-logo">
				<Logo size="xl" />
			</div>

			<!-- Floating product-themed glass cards — staggered bob animation,
			     constrained to the image canvas now. -->
			<div class="lk-auth-float lk-auth-float-1 lk-parallax-fast" aria-hidden="true">
				<span class="lk-auth-float-icon"><ShieldCheck size={14} /></span>
				<span class="caption">Secure Login</span>
			</div>
			<div class="lk-auth-float lk-auth-float-2 lk-parallax-reverse" aria-hidden="true">
				<span class="lk-auth-float-icon"><LineChart size={14} /></span>
				<span class="caption">Live Reports</span>
			</div>
			<div class="lk-auth-float lk-auth-float-3 lk-parallax-medium" aria-hidden="true">
				<span class="lk-auth-float-icon"><ShoppingCart size={14} /></span>
				<span class="caption">Lead Purchase</span>
			</div>
			<div class="lk-auth-float lk-auth-float-4 lk-parallax-fast" aria-hidden="true">
				<span class="lk-auth-float-icon"><Package size={14} /></span>
				<span class="caption">Inventory</span>
			</div>
		</div>

		<!-- ── BOTTOM HALF: solid navy text block ── -->
		<div class="lk-auth-brand-text">
			<div class="lk-auth-brand-content lk-parallax-slow">
				<h2 class="display-2 mb-6 leading-[1.1] text-white">
					Pharma Lead<br />Management, Simplified.
				</h2>
				<p class="body-base mb-8 max-w-lg text-white/80">
					End-to-end CRM, orders, inventory &amp; dispatch — built for India's PCD pharma market.
				</p>

				<div class="lk-auth-features">
					<div class="lk-auth-feature">
						<span class="lk-auth-feature-icon" aria-hidden="true">
							<ShieldCheck size={18} />
						</span>
						<span class="body-base text-white/90">Enterprise-grade security</span>
					</div>
					<div class="lk-auth-feature">
						<span class="lk-auth-feature-icon" aria-hidden="true">
							<TrendingUp size={18} />
						</span>
						<span class="body-base text-white/90">Real-time lead tracking</span>
					</div>
					<div class="lk-auth-feature">
						<span class="lk-auth-feature-icon" aria-hidden="true">
							<Truck size={18} />
						</span>
						<span class="body-base text-white/90">Order-to-dispatch pipeline</span>
					</div>
				</div>
			</div>

			<div class="lk-auth-footer caption">© LeadKart 2026</div>
		</div>
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
		      Sign In button bg + pill tint → #1140b6 ≈ oklch(0.43 0.19 264)
		      Sign In heading               → #00297d ≈ oklch(0.30 0.20 270)
		   Scoped here so the auth shell renders the canonical brand
		   colours without re-pivoting the entire token system. The
		   brand-panel glass pills tint via this same token to stay
		   DRY with the form-side button. */
		--color-brand-600: oklch(0.43 0.19 264); /* #1140b6 signin button + pill tint */
		--color-brand-700: oklch(0.3 0.2 270); /* #00297d signin text */
		--color-brand-800: oklch(0.24 0.16 272); /* derived darker stop */

		/* Brand-panel accent washes — derived from the logo's purple
		   highlights (#a05dce ≈ oklch 0.59 0.18 305) and green glow
		   (#0ef709 ≈ oklch 0.86 0.30 142). Lightened + low-chroma so
		   they read as ambient corner tints, not flat blocks. */
		--color-auth-accent-purple: oklch(0.78 0.12 305);
		--color-auth-accent-green: oklch(0.85 0.13 142);

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

	.lk-auth-brand {
		/* Outer panel has no padding now — the two child sections
		   (.lk-auth-brand-image, .lk-auth-brand-text) own their own
		   padding + bg. Fallback brand-900 covers any sub-pixel gaps
		   between the two halves. */
		background: var(--color-brand-900);
		color: var(--color-bg-elevated);
	}

	/* ── Top half: image canvas. Brand-100 base under the purple-tinted
	     illustration. flex: 1 makes it split the panel 50/50 with the
	     text block below. ── */
	.lk-auth-brand-image {
		position: relative;
		flex: 1 1 0;
		min-height: 0;
		overflow: hidden;
		background: var(--color-brand-100);
	}

	/* ── Bottom half: solid navy text block. Dedicated surface for the
	     hero typography — image stays out, no glass pills, no compromise
	     on contrast. Industry canon: Linear / Notion / Stripe split-
	     screen auth pages all keep text on intentional solid surfaces. ── */
	.lk-auth-brand-text {
		position: relative;
		flex: 1 1 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: clamp(2.5rem, 5vw, 4rem) clamp(2.5rem, 5vw, 4.5rem);
		background: var(--color-brand-800);
	}

	.lk-auth-page-logo {
		position: absolute;
		top: 1.75rem;
		left: 2rem;
		z-index: 6;
	}

	/* ── Brand content stack — lives inside the text block. ── */
	.lk-auth-brand-content {
		position: relative;
		z-index: 4;
		max-width: 32.5rem;
		width: 100%;
	}

	/* ── Feature rows — no glass chrome. Just a clean icon chip + label
	     on the solid navy. White label, green icon chip preserved for
	     brand accent. ── */
	.lk-auth-features {
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

	/* ── Illustration — full-bleed bg with radial mask + tinted glass.
	     Oversized 4rem in every direction (`inset: -4rem`) so the
	     parallax translate (up to ±3rem at the medium layer) never
	     exposes the panel edges. The brand panel itself has
	     `overflow: hidden` from its Tailwind class, so the overhang is
	     clipped — it just provides slack for the parallax to consume. */
	.lk-auth-illustration {
		position: absolute;
		inset: -4rem;
		z-index: 1;
		pointer-events: none;
		overflow: hidden;
	}
	.lk-auth-illustration-img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		opacity: 0.5;
		mask-image: radial-gradient(ellipse at center, black 50%, transparent 95%);
		-webkit-mask-image: radial-gradient(ellipse at center, black 50%, transparent 95%);
	}
	/* Hue-shift tint overlay layered ABOVE the image (sibling pseudo
	   on the container, not bg on the img — the latter sits behind
	   the image's opaque pixels and never shows). `mix-blend-mode:
	   color` keeps the image's luminance (the man, laptop, glow
	   labels stay readable) while replacing hue + saturation with
	   the logo-derived purple. Same radial mask so the tint fades
	   at the corners with the image itself, leaving the panel's
	   green corner wash intact. */
	.lk-auth-illustration::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--color-auth-accent-purple);
		mix-blend-mode: color;
		opacity: 0.85;
		mask-image: radial-gradient(ellipse at center, black 50%, transparent 95%);
		-webkit-mask-image: radial-gradient(ellipse at center, black 50%, transparent 95%);
		pointer-events: none;
	}

	/* ── Floating glass cards — heavily transparent brand-600 tint
	     (matches the pills + features) so the illustration shows
	     through. White caption text with text-shadow for legibility;
	     secondary-100 icon chip preserves the green accent. The
	     global `.caption` rule sets color: fg-muted, so we override
	     it here to inherit the parent's white. ── */
	.lk-auth-float {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5em 0.875em 0.5em 0.625em;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-brand-600) 22%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-bg-elevated) 22%, transparent);
		backdrop-filter: blur(16px) saturate(1.3);
		-webkit-backdrop-filter: blur(16px) saturate(1.3);
		white-space: nowrap;
		z-index: 5;
		pointer-events: none;
		box-shadow:
			0 4px 16px color-mix(in srgb, var(--color-brand-900) 25%, transparent),
			inset 0 1px 0 color-mix(in srgb, var(--color-bg-elevated) 22%, transparent);
		overflow: hidden;
		color: var(--color-bg-elevated);
	}
	.lk-auth-float::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--color-bg-elevated) 14%, transparent) 0%,
			transparent 100%
		);
		border-radius: 0.75rem 0.75rem 0 0;
		pointer-events: none;
	}
	.lk-auth-float-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.625rem;
		height: 1.625rem;
		border-radius: 0.4375rem;
		background: color-mix(in srgb, var(--color-secondary-100) 70%, transparent);
		color: var(--color-secondary-700);
		flex-shrink: 0;
	}

	/* Force-override the global `.caption { color: var(--color-fg-muted) }`
	   rule (typography.css §caption) inside the brand panel. Same
	   specificity (0,1,0) as the global, but later in cascade order
	   within the scoped .lk-auth subtree. Affects the float-card
	   captions + the footer copyright. */
	.lk-auth-float .caption,
	.lk-auth-footer.caption {
		color: var(--color-bg-elevated);
		text-shadow: 0 1px 2px color-mix(in srgb, var(--color-brand-900) 30%, transparent);
	}

	/* Float-card positions — relative to the image canvas section
	   (not the full brand panel as before). Percentages re-tuned to
	   spread the four cards across the smaller area. */
	.lk-auth-float-1 {
		top: 14%;
		right: 12%;
		animation: lk-float-bob 6s ease-in-out infinite;
	}
	.lk-auth-float-2 {
		top: 56%;
		right: 5%;
		animation: lk-float-bob 7s ease-in-out 1s infinite;
	}
	.lk-auth-float-3 {
		top: 30%;
		left: 8%;
		animation: lk-float-bob 8s ease-in-out 2s infinite;
	}
	.lk-auth-float-4 {
		bottom: 12%;
		left: 22%;
		animation: lk-float-bob 6.5s ease-in-out 0.5s infinite;
	}

	@keyframes lk-float-bob {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -0.5rem;
		}
	}

	/* ── Mouse-driven parallax layers — consumes --mouse-x / --mouse-y
	     written by the onMount mousemove handler. translate scales by
	     per-layer rem amount; reduced-motion users get instant transitions
	     via the global override in base.css. ── */
	.lk-parallax-slow {
		transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		transform: translate(calc(var(--mouse-x, 0) * 0.75rem), calc(var(--mouse-y, 0) * 0.75rem));
		will-change: transform;
		backface-visibility: hidden;
	}
	.lk-parallax-medium {
		transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		transform: translate(calc(var(--mouse-x, 0) * 1.875rem), calc(var(--mouse-y, 0) * 1.875rem));
		will-change: transform;
		backface-visibility: hidden;
	}
	.lk-parallax-fast {
		transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		transform: translate(calc(var(--mouse-x, 0) * 3.125rem), calc(var(--mouse-y, 0) * 3.125rem));
		will-change: transform;
		backface-visibility: hidden;
	}
	.lk-parallax-reverse {
		transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		transform: translate(calc(var(--mouse-x, 0) * -1.25rem), calc(var(--mouse-y, 0) * -1.25rem));
		will-change: transform;
		backface-visibility: hidden;
	}

	/* Footer copyright — sits at the bottom of the text block,
	   right-aligned for visual balance against the left-aligned
	   hero text. Inherits white from .lk-auth-brand-text. */
	.lk-auth-footer {
		margin-top: clamp(2rem, 4vh, 3rem);
		opacity: 0.55;
		color: var(--color-bg-elevated);
	}

	/* ── Reduced motion: kill bobbing + parallax. The parallax effect-hook
	     bails on the same query, but the keyframe-based bob needs an
	     explicit override. ── */
	@media (prefers-reduced-motion: reduce) {
		.lk-auth-float-1,
		.lk-auth-float-2,
		.lk-auth-float-3,
		.lk-auth-float-4 {
			animation: none;
		}
		.lk-parallax-slow,
		.lk-parallax-medium,
		.lk-parallax-fast,
		.lk-parallax-reverse {
			transform: none;
		}
	}
</style>
