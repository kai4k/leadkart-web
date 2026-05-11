<script lang="ts">
	/**
	 * AuthShell — two-column auth layout, image-hero brand panel.
	 *
	 * Left column (desktop only) — split 50/50:
	 *   Top half  → image canvas with mouse-driven parallax:
	 *               · Logo top-left
	 *               · Product illustration (radial-masked, oversized for parallax overhang)
	 *               · 4 floating product-stat cards (bob + parallax)
	 *               · Logo-palette ambient washes: purple top-right,
	 *                 green bottom-left, blue centre
	 *   Bottom half → solid brand-800 navy text block:
	 *               · Hero typography
	 *               · Tagline
	 *               · Feature list (icon chip + label, no chrome)
	 *               · Footer copyright
	 *
	 * Right column → form panel slot.
	 * Mobile (< lg) → compact brand banner + form panel only.
	 *
	 * Industry refs:
	 *   - Vercel / Linear / Resend / Cal.com / Framer marketing-page
	 *     auth surfaces: animated illustration hero + mouse parallax +
	 *     floating product-stat cards. The 2025-26 SaaS canon.
	 *   - Apple HIG "Animation" (parallax driven by cursor input)
	 *   - Material 3 hero parallax patterns
	 *
	 * Accessibility:
	 *   - prefers-reduced-motion gates ALL parallax + bob animations
	 *   - Floats are aria-hidden (decorative product chrome)
	 *   - Illustration aria-hidden + alt="" — hero typography below
	 *     carries the brand message
	 *   - prefers-reduced-transparency falls back to solid surfaces
	 *     (utilities.css fallback)
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
	<!-- Mobile-only compact brand banner. -->
	<header
		class="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-brand-50)] px-6 py-4 text-[var(--color-brand-700)] lg:hidden"
	>
		<Logo size="md" />
		<span class="caption font-medium text-[var(--color-brand-700)]">Pharma SaaS</span>
	</header>

	<!-- ═══ BRAND PANEL (desktop only) ════════════════════════════════ -->
	<section
		bind:this={brandPanel}
		aria-label="LeadKart"
		class="lk-auth-brand relative hidden overflow-hidden lg:flex lg:flex-col"
	>
		<!-- ── TOP: image canvas with parallax + floats ── -->
		<div class="lk-auth-brand-image">
			<!-- Layered logo-palette washes (purple top-right, green
			     bottom-left, blue centre) — sit BELOW the illustration
			     and provide the colour DNA when the image fades at its
			     radial-mask edges. -->
			<div class="lk-auth-washes" aria-hidden="true"></div>

			<div class="lk-auth-illustration lk-parallax-medium" aria-hidden="true">
				<img src="/images/auth/illustration.png" alt="" class="lk-auth-illustration-img" />
			</div>

			<div class="lk-auth-page-logo lk-parallax-slow">
				<Logo size="xl" />
			</div>

			<!-- Floating product-stat cards. Flat-design (mostly opaque
			     white surface, subtle shadow, colour-coded icon chip) —
			     the modern Vercel / Linear / Resend treatment, NOT
			     translucent glass-pill chrome. -->
			<div class="lk-auth-float lk-auth-float-1 lk-parallax-fast" aria-hidden="true">
				<span class="lk-auth-float-icon lk-auth-float-icon--purple">
					<ShieldCheck size={14} />
				</span>
				<span class="lk-auth-float-label">Secure Login</span>
			</div>
			<div class="lk-auth-float lk-auth-float-2 lk-parallax-reverse" aria-hidden="true">
				<span class="lk-auth-float-icon lk-auth-float-icon--blue">
					<LineChart size={14} />
				</span>
				<span class="lk-auth-float-label">Live Reports</span>
			</div>
			<div class="lk-auth-float lk-auth-float-3 lk-parallax-medium" aria-hidden="true">
				<span class="lk-auth-float-icon lk-auth-float-icon--green">
					<ShoppingCart size={14} />
				</span>
				<span class="lk-auth-float-label">Lead Purchase</span>
			</div>
			<div class="lk-auth-float lk-auth-float-4 lk-parallax-fast" aria-hidden="true">
				<span class="lk-auth-float-icon lk-auth-float-icon--blue">
					<Package size={14} />
				</span>
				<span class="lk-auth-float-label">Inventory</span>
			</div>
		</div>

		<!-- ── BOTTOM: solid navy text block ── -->
		<div class="lk-auth-brand-text">
			<div class="lk-auth-brand-content lk-parallax-slow">
				<h2 class="display-2 mb-6 leading-[1.1] text-white">
					Pharma lead management,<br />simplified.
				</h2>
				<p class="body-base mb-10 max-w-md text-white/75">
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

			<div class="lk-auth-brand-footer caption">© LeadKart 2026</div>
		</div>
	</section>

	<!-- ═══ FORM PANEL ═══════════════════════════════════════════════ -->
	<main class="lk-auth-form-side flex flex-col items-center justify-center p-6 lg:p-12">
		<div class="w-full max-w-md">
			{@render children()}
		</div>
	</main>
</div>

<style>
	/* ── AuthShell-wide THEME LOCK to light values. ── */
	.lk-auth {
		--color-bg: oklch(0.99 0 0);
		--color-bg-subtle: oklch(0.97 0 0);
		--color-bg-muted: oklch(0.95 0 0);
		--color-bg-elevated: oklch(1 0 0);
		--color-fg: oklch(0.2 0.02 256);
		--color-fg-muted: oklch(0.45 0.02 256);
		--color-fg-subtle: oklch(0.6 0.02 256);
		--color-border: oklch(0.9 0.01 256);
		--color-border-strong: oklch(0.8 0.01 256);

		/* Brand stops pinned to the LeadKart logo + signin spec
		   (user-supplied colours):
		      Logo blue (deep)       → #3146a5 ≈ oklch(0.41 0.20 269)
		      Sign-in button         → #1140b6 ≈ oklch(0.43 0.19 264)
		      Sign-in heading        → #00297d ≈ oklch(0.30 0.20 270)
		      Logo wordmark navy     → #47356b ≈ oklch(0.33 0.10 296) */
		--color-brand-600: oklch(0.43 0.19 264); /* #1140b6 signin button */
		--color-brand-700: oklch(0.3 0.2 270); /* #00297d signin text */
		--color-brand-800: oklch(0.24 0.16 272); /* brand-panel surface */

		/* Logo-palette accents — used in image-canvas washes + float
		   card colour-coding. All three live in the same ~290° hue
		   sweep that anchors LeadKart's identity. */
		--color-logo-purple: oklch(0.62 0.18 305); /* #a05dce highlight */
		--color-logo-green: oklch(0.78 0.22 142); /* #0ef709 inner-K glow */
		--color-logo-blue: oklch(0.41 0.2 269); /* #3146a5 wordmark blue */

		--color-brand-heading: var(--color-brand-700);
		--color-brand-link: var(--color-brand-600);
		--color-brand-link-hover: var(--color-brand-700);
	}

	.lk-auth-form-side {
		background: var(--color-bg-elevated);
	}

	/* ── Brand panel: 50/50 image-canvas + text-block split. ── */
	.lk-auth-brand {
		background: var(--color-brand-900);
		color: var(--color-bg-elevated);
	}

	.lk-auth-brand-image {
		position: relative;
		flex: 1 1 0;
		min-height: 0;
		overflow: hidden;
		background: var(--color-brand-900);
	}

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

	/* ── Logo-palette washes — layered radials in the image canvas.
	     Each wash is a logo accent at low intensity (25-35%) over the
	     brand-900 base, giving the canvas its colour DNA before the
	     illustration paints on top. ── */
	.lk-auth-washes {
		position: absolute;
		inset: 0;
		z-index: 0;
		background:
			radial-gradient(
				ellipse 70% 55% at 100% 0%,
				color-mix(in srgb, var(--color-logo-purple) 32%, transparent) 0%,
				transparent 60%
			),
			radial-gradient(
				ellipse 60% 50% at 0% 100%,
				color-mix(in srgb, var(--color-logo-green) 22%, transparent) 0%,
				transparent 65%
			),
			radial-gradient(
				ellipse 80% 60% at 50% 50%,
				color-mix(in srgb, var(--color-logo-blue) 25%, transparent) 0%,
				transparent 75%
			);
		pointer-events: none;
	}

	.lk-auth-page-logo {
		position: absolute;
		top: 1.75rem;
		left: 2rem;
		z-index: 6;
	}

	/* ── Brand text content stack (bottom block) ── */
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
	.lk-auth-brand-footer.caption {
		color: var(--color-bg-elevated);
	}

	/* ── Feature rows (bottom block) — no chrome, just icon + label ── */
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
		background: color-mix(in srgb, var(--color-logo-green) 22%, transparent);
		color: color-mix(in srgb, var(--color-logo-green) 70%, white);
		flex-shrink: 0;
	}

	/* ── Illustration — oversized -4rem on all sides so parallax (up
	     to ±3rem at the medium layer) never exposes the canvas edges. ── */
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
		/* No mix-blend-mode tint, no heavy opacity reduction.
		   The illustration reads naturally; the radial mask softens
		   its edges into the colour washes; an inset bottom shadow
		   gives it depth without recolouring. */
		opacity: 0.78;
		mask-image: radial-gradient(ellipse 75% 70% at center, black 45%, transparent 92%);
		-webkit-mask-image: radial-gradient(ellipse 75% 70% at center, black 45%, transparent 92%);
	}
	/* Bottom-fade overlay — drops the image into the canvas without
	   competing with the washes; gives a sense of depth + recession. */
	.lk-auth-illustration::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			transparent 0%,
			transparent 55%,
			color-mix(in srgb, var(--color-brand-900) 35%, transparent) 100%
		);
		pointer-events: none;
	}

	/* ── Floating product-stat cards — flat white-surface design.
	     Modern SaaS hero canon (Vercel / Linear / Resend): mostly-
	     opaque white card, subtle shadow, colour-coded icon chip. ── */
	.lk-auth-float {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.875rem 0.5rem 0.625rem;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-bg-elevated) 92%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-bg-elevated) 60%, transparent);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		white-space: nowrap;
		z-index: 5;
		pointer-events: none;
		box-shadow:
			0 8px 24px color-mix(in srgb, var(--color-brand-900) 35%, transparent),
			0 2px 4px color-mix(in srgb, var(--color-brand-900) 20%, transparent);
		color: var(--color-brand-700);
	}
	.lk-auth-float-label {
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.01em;
	}
	.lk-auth-float-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.625rem;
		height: 1.625rem;
		border-radius: 0.4375rem;
		flex-shrink: 0;
	}
	.lk-auth-float-icon--purple {
		background: color-mix(in srgb, var(--color-logo-purple) 18%, white);
		color: color-mix(in srgb, var(--color-logo-purple) 75%, black);
	}
	.lk-auth-float-icon--green {
		background: color-mix(in srgb, var(--color-logo-green) 18%, white);
		color: color-mix(in srgb, var(--color-logo-green) 60%, black);
	}
	.lk-auth-float-icon--blue {
		background: color-mix(in srgb, var(--color-brand-600) 15%, white);
		color: var(--color-brand-600);
	}

	/* Float positions relative to the image canvas. */
	.lk-auth-float-1 {
		top: 14%;
		right: 12%;
		animation: lk-float-bob 6s ease-in-out infinite;
	}
	.lk-auth-float-2 {
		top: 58%;
		right: 6%;
		animation: lk-float-bob 7s ease-in-out 1s infinite;
	}
	.lk-auth-float-3 {
		top: 32%;
		left: 8%;
		animation: lk-float-bob 8s ease-in-out 2s infinite;
	}
	.lk-auth-float-4 {
		bottom: 14%;
		left: 24%;
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

	/* ── Mouse-driven parallax layers. ── */
	.lk-parallax-slow {
		transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		transform: translate(calc(var(--mouse-x, 0) * 0.5rem), calc(var(--mouse-y, 0) * 0.5rem));
		will-change: transform;
		backface-visibility: hidden;
	}
	.lk-parallax-medium {
		transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		transform: translate(calc(var(--mouse-x, 0) * 1.5rem), calc(var(--mouse-y, 0) * 1.5rem));
		will-change: transform;
		backface-visibility: hidden;
	}
	.lk-parallax-fast {
		transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		transform: translate(calc(var(--mouse-x, 0) * 2.5rem), calc(var(--mouse-y, 0) * 2.5rem));
		will-change: transform;
		backface-visibility: hidden;
	}
	.lk-parallax-reverse {
		transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		transform: translate(calc(var(--mouse-x, 0) * -1.25rem), calc(var(--mouse-y, 0) * -1.25rem));
		will-change: transform;
		backface-visibility: hidden;
	}

	/* ── Reduced motion: kill bobbing + parallax. ── */
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
