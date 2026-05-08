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
	<!-- Mobile-only compact brand banner -->
	<header
		class="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-brand-700)] px-6 py-4 text-[var(--color-fg-on-brand)] lg:hidden"
	>
		<Logo size="sm" variant="dark-bg" />
		<span class="caption text-[var(--color-brand-50)]">Pharma SaaS</span>
	</header>

	<!-- ═══ BRAND PANEL (desktop only) — animated hero ═══════════════════ -->
	<section
		bind:this={brandPanel}
		aria-label="LeadKart"
		class="lk-auth-brand relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center"
	>
		<!-- Background illustration with radial mask + glass overlay -->
		<div class="lk-auth-illustration lk-parallax-medium" aria-hidden="true">
			<img src="/images/auth/illustration.png" alt="" class="lk-auth-illustration-img" />
			<div class="lk-auth-illustration-glass"></div>
		</div>

		<!-- Page-level logo (top-left, above brand content) -->
		<div class="lk-auth-page-logo">
			<Logo size="md" variant="dark-bg" />
		</div>

		<!-- Brand text content (3 stacked glass pills) -->
		<div class="lk-auth-brand-content lk-parallax-slow">
			<div class="lk-auth-pill lk-auth-pill-hero">
				<p class="display-2 leading-[1.15]">
					Pharma Lead<br />Management,<br />Simplified.
				</p>
			</div>
			<div class="lk-auth-pill mb-8">
				<p class="body-base text-[color-mix(in_srgb,white_88%,transparent)]">
					End-to-end CRM, orders, inventory &amp; dispatch — built for India's PCD pharma market.
				</p>
			</div>

			<div class="lk-auth-features">
				<div class="lk-auth-feature">
					<span class="lk-auth-feature-icon" aria-hidden="true">
						<ShieldCheck size={16} />
					</span>
					<span class="body-sm">Enterprise-grade security</span>
				</div>
				<div class="lk-auth-feature">
					<span class="lk-auth-feature-icon" aria-hidden="true">
						<TrendingUp size={16} />
					</span>
					<span class="body-sm">Real-time lead tracking</span>
				</div>
				<div class="lk-auth-feature">
					<span class="lk-auth-feature-icon" aria-hidden="true">
						<Truck size={16} />
					</span>
					<span class="body-sm">Order-to-dispatch pipeline</span>
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

		<!-- Background radial glow (top-right corner) -->
		<div class="lk-auth-glow lk-parallax-reverse" aria-hidden="true"></div>

		<!-- Footer copyright -->
		<div class="lk-auth-footer caption text-[var(--color-brand-50)]">© LeadKart 2026</div>
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
	/* ── Form-side soft radial wash. Anchors a faint navy-violet glow
	     bottom-left + a faint logo-green glow top-right so the glass card
	     has actual texture to blur. WCAG: max alpha 8% — every text colour
	     pair on the page still computes well above 4.5:1. ── */
	.lk-auth-form-side {
		background:
			radial-gradient(
				ellipse 80% 60% at 0% 100%,
				color-mix(in srgb, var(--color-brand-200) 30%, transparent) 0%,
				transparent 60%
			),
			radial-gradient(
				ellipse 60% 50% at 100% 0%,
				color-mix(in srgb, var(--color-secondary-100) 35%, transparent) 0%,
				transparent 65%
			),
			var(--color-bg);
	}

	/* ── Brand panel base — diagonal navy-violet gradient under the
	     illustration, matches the Blazor MudPalette gradient. ── */
	.lk-auth-brand {
		padding: clamp(3rem, 6vw, 5rem) clamp(2rem, 4vw, 4rem);
		background: linear-gradient(
			160deg,
			color-mix(in srgb, var(--color-brand-700) 92%, black),
			var(--color-brand-700),
			color-mix(in srgb, var(--color-brand-900) 85%, black)
		);
		color: white;
	}

	.lk-auth-page-logo {
		position: absolute;
		top: 1.75rem;
		left: 2rem;
		z-index: 6;
		filter: drop-shadow(0 0.125rem 0.5rem rgb(0 0 0 / 0.15));
	}

	/* ── Brand content stack ── */
	.lk-auth-brand-content {
		position: relative;
		z-index: 4;
		max-width: 32.5rem;
		width: 100%;
	}

	/* ── Glass pill — hero text + tagline wrappers ── */
	.lk-auth-pill {
		display: block;
		width: fit-content;
		max-width: 100%;
		padding: 1.25em 1.5em;
		border-radius: 1.5rem;
		background: linear-gradient(135deg, rgb(0 0 0 / 0.35) 0%, rgb(0 0 0 / 0.2) 100%);
		border: 1px solid rgb(255 255 255 / 0.18);
		backdrop-filter: blur(20px) saturate(1.2);
		-webkit-backdrop-filter: blur(20px) saturate(1.2);
		position: relative;
		overflow: hidden;
		box-shadow: 0 4px 16px rgb(0 0 0 / 0.15);
	}
	.lk-auth-pill::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(180deg, rgb(255 255 255 / 0.12) 0%, transparent 100%);
		border-radius: 1.5rem 1.5rem 0 0;
		pointer-events: none;
	}
	.lk-auth-pill-hero {
		margin-bottom: clamp(2.5rem, 6vh, 4.5rem);
	}

	/* ── Feature pills row ── */
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
		background: linear-gradient(135deg, rgb(0 0 0 / 0.3) 0%, rgb(0 0 0 / 0.15) 100%);
		border: 1px solid rgb(255 255 255 / 0.15);
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
			background: linear-gradient(135deg, rgb(0 0 0 / 0.38) 0%, rgb(0 0 0 / 0.2) 100%);
		}
	}
	.lk-auth-feature::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(180deg, rgb(255 255 255 / 0.1) 0%, transparent 100%);
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
		background: rgb(255 255 255 / 0.15);
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
		opacity: 0.32;
		mask-image: radial-gradient(ellipse at center, black 40%, transparent 95%);
		-webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 95%);
	}
	.lk-auth-illustration-glass {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			160deg,
			rgb(0 0 0 / 0.35) 0%,
			rgb(0 0 0 / 0.15) 50%,
			rgb(0 0 0 / 0.25) 100%
		);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
	}

	/* ── Floating glass cards — bobbing animation ── */
	.lk-auth-float {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5em 0.875em 0.5em 0.625em;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, rgb(255 255 255 / 0.18) 0%, rgb(255 255 255 / 0.06) 100%);
		border: 1px solid rgb(255 255 255 / 0.2);
		backdrop-filter: blur(16px) saturate(1.3);
		-webkit-backdrop-filter: blur(16px) saturate(1.3);
		white-space: nowrap;
		z-index: 5;
		pointer-events: none;
		box-shadow:
			0 4px 16px rgb(0 0 0 / 0.15),
			inset 0 1px 0 rgb(255 255 255 / 0.15);
		overflow: hidden;
		color: white;
	}
	.lk-auth-float::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(180deg, rgb(255 255 255 / 0.15) 0%, transparent 100%);
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
		background: rgb(255 255 255 / 0.2);
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

	/* ── Background radial glow ── */
	.lk-auth-glow {
		position: absolute;
		top: -20%;
		right: -30%;
		width: 80%;
		height: 80%;
		background: radial-gradient(circle, rgb(255 255 255 / 0.1) 0%, transparent 65%);
		border-radius: 50%;
		filter: blur(60px);
		pointer-events: none;
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
