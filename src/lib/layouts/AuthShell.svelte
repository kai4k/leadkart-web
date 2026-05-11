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

	<!-- ═══ BRAND PANEL (desktop only) — animated hero ═══════════════════ -->
	<section
		bind:this={brandPanel}
		aria-label="LeadKart"
		class="lk-auth-brand relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center"
	>
		<!-- Background illustration — radial mask only. No white glass
		     overlay (it was swallowing the image at any reasonable
		     opacity). The brand-100 panel bg provides enough contrast
		     against the hero typography on top. -->
		<div class="lk-auth-illustration lk-parallax-medium" aria-hidden="true">
			<img src="/images/auth/illustration.png" alt="" class="lk-auth-illustration-img" />
		</div>

		<!-- Page-level logo — bare, no pill chrome. The brand panel bg is
		     brand-50 (the logo's natural light backdrop), so the wordmark
		     navy + LK mark green read directly without any containment. -->
		<div class="lk-auth-page-logo">
			<Logo size="xl" />
		</div>

		<!-- Brand text content (3 stacked light-glass pills) -->
		<div class="lk-auth-brand-content lk-parallax-slow">
			<div class="lk-auth-pill lk-auth-pill-hero">
				<p class="display-2 leading-[1.15] text-[var(--color-brand-700)]">
					Pharma Lead<br />Management,<br />Simplified.
				</p>
			</div>
			<div class="lk-auth-pill mb-8">
				<p class="body-base text-[var(--color-brand-800)]">
					End-to-end CRM, orders, inventory &amp; dispatch — built for India's PCD pharma market.
				</p>
			</div>

			<div class="lk-auth-features">
				<div class="lk-auth-feature">
					<span class="lk-auth-feature-icon" aria-hidden="true">
						<ShieldCheck size={16} />
					</span>
					<span class="body-sm text-[var(--color-brand-800)]">Enterprise-grade security</span>
				</div>
				<div class="lk-auth-feature">
					<span class="lk-auth-feature-icon" aria-hidden="true">
						<TrendingUp size={16} />
					</span>
					<span class="body-sm text-[var(--color-brand-800)]">Real-time lead tracking</span>
				</div>
				<div class="lk-auth-feature">
					<span class="lk-auth-feature-icon" aria-hidden="true">
						<Truck size={16} />
					</span>
					<span class="body-sm text-[var(--color-brand-800)]">Order-to-dispatch pipeline</span>
				</div>
			</div>
		</div>

		<!-- Floating product-themed glass cards — staggered bob animation. -->
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
		<div class="lk-auth-float lk-auth-float-5 lk-parallax-reverse" aria-hidden="true">
			<span class="lk-auth-float-icon"><TrendingUp size={14} /></span>
			<span class="caption">Lead Tracking</span>
		</div>

		<!-- Background radial glows are now baked into the brand-panel
		     bg as layered conic washes (purple top-right, green bottom-
		     left). The separate floating glow blob was competing with
		     them — removed. -->

		<!-- Footer copyright -->
		<div class="lk-auth-footer caption text-[var(--color-brand-700)] opacity-70">
			© LeadKart 2026
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
		   LeadKart brand spec (user-supplied 2026-05-10):
		      Sign In button bg  → #00348d ≈ oklch(0.34 0.21 268)
		      Sign In heading    → #00297d ≈ oklch(0.30 0.20 270)
		   These are deep indigo-navy, more saturated than the global
		   brand-600/700 tokens (which are oklch hue 260 navy-violet).
		   Scoped here so the auth shell renders the canonical brand
		   colours without re-pivoting the entire token system. */
		--color-brand-600: oklch(0.34 0.21 268); /* #00348d signin button */
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
		padding: clamp(3rem, 6vw, 5rem) clamp(2rem, 4vw, 4rem);
		/* Layered radial washes over the indigo brand-100 base:
		     - Top-right corner: soft purple from the logo's #a05dce
		       glass highlight, tinting the upper portion lavender.
		     - Bottom-left corner: soft green from the logo's #0ef709
		       inner-K glow, tinting the lower-left wash.
		     - Base: var(--color-brand-100) indigo.
		   Each wash kept at ~25% alpha so they read as ambience, not
		   competing planes. */
		background:
			radial-gradient(
				ellipse 75% 60% at 100% 0%,
				color-mix(in srgb, var(--color-auth-accent-purple) 35%, transparent) 0%,
				transparent 55%
			),
			radial-gradient(
				ellipse 70% 55% at 0% 100%,
				color-mix(in srgb, var(--color-auth-accent-green) 30%, transparent) 0%,
				transparent 60%
			),
			var(--color-brand-100);
		color: var(--color-brand-800);
	}

	.lk-auth-page-logo {
		position: absolute;
		top: 1.75rem;
		left: 2rem;
		z-index: 6;
	}

	/* ── Brand content stack ── */
	.lk-auth-brand-content {
		position: relative;
		z-index: 4;
		max-width: 32.5rem;
		width: 100%;
	}

	/* ── Glass pill — hero text + tagline wrappers. Much lower white
	     mix (40% bg-elevated vs prior 70%) so the illustration shows
	     through behind the text rather than being masked. Backdrop-
	     filter blur still gives the "frosted glass over photograph"
	     effect; the border + shadow keep the pill from disappearing
	     into the wash. ── */
	.lk-auth-pill {
		display: block;
		width: fit-content;
		max-width: 100%;
		padding: 1.25em 1.5em;
		border-radius: 1.5rem;
		background: color-mix(in srgb, var(--color-bg-elevated) 40%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-brand-200) 60%, transparent);
		backdrop-filter: blur(20px) saturate(1.2);
		-webkit-backdrop-filter: blur(20px) saturate(1.2);
		position: relative;
		overflow: hidden;
		box-shadow: 0 4px 16px color-mix(in srgb, var(--color-brand-900) 10%, transparent);
	}
	.lk-auth-pill::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--color-bg-elevated) 50%, transparent) 0%,
			transparent 100%
		);
		border-radius: 1.5rem 1.5rem 0 0;
		pointer-events: none;
	}
	.lk-auth-pill-hero {
		margin-bottom: clamp(2.5rem, 6vh, 4.5rem);
	}

	/* ── Feature pills row — same light-glass treatment, tighter. ── */
	.lk-auth-features {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}
	.lk-auth-feature {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 1rem;
		border-radius: 0.875rem;
		background: color-mix(in srgb, var(--color-bg-elevated) 35%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-brand-200) 55%, transparent);
		backdrop-filter: blur(16px) saturate(1.2);
		-webkit-backdrop-filter: blur(16px) saturate(1.2);
		position: relative;
		overflow: hidden;
		transition:
			transform 0.2s ease,
			background 0.2s ease;
	}
	@media (hover: hover) {
		.lk-auth-feature:hover {
			transform: translateX(0.25rem);
			background: color-mix(in srgb, var(--color-bg-elevated) 55%, transparent);
		}
	}
	.lk-auth-feature::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--color-bg-elevated) 40%, transparent) 0%,
			transparent 100%
		);
		border-radius: 0.875rem 0.875rem 0 0;
		pointer-events: none;
	}
	.lk-auth-feature-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--color-secondary-100) 80%, transparent);
		color: var(--color-secondary-700);
		flex-shrink: 0;
	}

	/* ── Illustration — full-bleed bg with radial mask + tinted glass ── */
	.lk-auth-illustration {
		position: absolute;
		inset: 0;
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

	/* ── Floating glass cards — bobbing animation. Light-glass on the
	     light brand panel: 70% bg-elevated mix with brand-100 border,
	     brand-700 typography, secondary-100 icon backdrop for the
	     green accent. ── */
	.lk-auth-float {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5em 0.875em 0.5em 0.625em;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-bg-elevated) 40%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-brand-200) 50%, transparent);
		backdrop-filter: blur(16px) saturate(1.3);
		-webkit-backdrop-filter: blur(16px) saturate(1.3);
		white-space: nowrap;
		z-index: 5;
		pointer-events: none;
		box-shadow:
			0 4px 16px color-mix(in srgb, var(--color-brand-900) 10%, transparent),
			inset 0 1px 0 color-mix(in srgb, var(--color-bg-elevated) 60%, transparent);
		overflow: hidden;
		color: var(--color-brand-700);
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
			color-mix(in srgb, var(--color-bg-elevated) 35%, transparent) 0%,
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

	.lk-auth-float-1 {
		top: 12%;
		right: 10%;
		animation: lk-float-bob 6s ease-in-out infinite;
	}
	.lk-auth-float-2 {
		top: 35%;
		right: 3%;
		animation: lk-float-bob 7s ease-in-out 1s infinite;
	}
	.lk-auth-float-3 {
		bottom: 38%;
		right: 6%;
		animation: lk-float-bob 8s ease-in-out 2s infinite;
	}
	.lk-auth-float-4 {
		bottom: 18%;
		right: 18%;
		animation: lk-float-bob 6.5s ease-in-out 0.5s infinite;
	}
	.lk-auth-float-5 {
		bottom: 8%;
		left: 15%;
		animation: lk-float-bob 7.5s ease-in-out 3s infinite;
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

	.lk-auth-footer {
		position: absolute;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 4;
		opacity: 0.7;
	}

	/* ── Reduced motion: kill bobbing + parallax. The parallax effect-hook
	     bails on the same query, but the keyframe-based bob needs an
	     explicit override. ── */
	@media (prefers-reduced-motion: reduce) {
		.lk-auth-float-1,
		.lk-auth-float-2,
		.lk-auth-float-3,
		.lk-auth-float-4,
		.lk-auth-float-5 {
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
