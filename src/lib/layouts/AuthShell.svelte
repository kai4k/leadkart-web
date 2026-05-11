<script lang="ts">
	/**
	 * AuthShell — unified auth surface with a viewport-wide particle canvas.
	 *
	 * Architecture:
	 *   One root container (`.lk-auth`) owns the whole viewport. Inside:
	 *     1. Particle field (three depth layers, mouse-driven parallax) —
	 *        spans the entire root via absolute positioning.
	 *     2. Mobile-only brand banner (shown below `lg`).
	 *     3. Two-column layout grid: brand panel (left) + form panel (right).
	 *   Both panels are transparent — the particle canvas shows through
	 *   continuously across the whole page. Decoration is global, not
	 *   per-half.
	 *
	 * Static surfaces, animated canvas:
	 *   The modal card and brand-side content (hero + tagline + feature
	 *   pills) are static. Only the particle layers move (drift + parallax).
	 *   The visual hierarchy reads as "calm content on a living surface."
	 *
	 * Brand mark — one per screen (Stripe / Linear / Vercel canon):
	 *   - Desktop: logo top-left of the brand panel only.
	 *   - Mobile: logo in the compact banner only.
	 *   The auth modal carries the page's primary `<h1>` (Sign in) but no
	 *   separate logo — duplication is brand dilution.
	 *
	 * Responsive — no fixed widths:
	 *   All width caps use `clamp()` / `min()` so the layout fluidly
	 *   degrades across viewport sizes. Single layout breakpoint at `lg`
	 *   (64rem) toggles between mobile-stack and desktop-split.
	 *
	 * Industry refs (2026):
	 *   - Antigravity / Vercel marketing — full-viewport particle canvas
	 *   - Stripe Atlas / Linear / Vercel — single brand mark, decoration
	 *     spans the canvas not per-half
	 *   - Apple Liquid Glass (iOS 26) — translucent surfaces over a
	 *     coloured/animated canvas, content stays static while the canvas
	 *     moves
	 *
	 * Accessibility:
	 *   - Particle field + decorative brand content are `aria-hidden`
	 *   - Marketing hero copy uses `<p class="display-2">` (not `<h2>`) so
	 *     SigninForm's `<h1>` stays the page's only true heading
	 *   - `prefers-reduced-motion` gates particle drift + parallax
	 *   - `prefers-reduced-transparency` falls back via utilities.css
	 */
	import { onMount } from 'svelte';
	import { Logo } from '$ui';
	import { ShieldCheck, TrendingUp, Truck } from 'lucide-svelte';

	let { children } = $props();
	let canvas: HTMLElement | undefined = $state();
	let parallaxActive = $state(false);

	/**
	 * Pre-bucketed particle field. Deterministic seeded PRNG keeps SSR
	 * pre-render byte-identical to client hydration. 120 particles for
	 * full-viewport coverage; bucketed by depth in script (one filter
	 * pass) instead of per-render in the template.
	 */
	const { FAR, MID, NEAR } = (() => {
		let seed = 7919;
		const rand = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return seed / 233280;
		};
		// Colour weighted toward neutrals so the logo accents read as
		// deliberate moments, not visual noise.
		const palette = ['neutral', 'neutral', 'neutral', 'purple', 'blue', 'green'];
		const all = Array.from({ length: 180 }, () => {
			const d = rand();
			return {
				x: rand() * 100,
				y: rand() * 100,
				length: 4 + rand() * 8,
				rotation: rand() * 360,
				colour: palette[Math.floor(rand() * palette.length)],
				delay: rand() * 2,
				depth: d < 0.4 ? 'far' : d < 0.7 ? 'mid' : 'near'
			};
		});
		return {
			FAR: all.filter((p) => p.depth === 'far'),
			MID: all.filter((p) => p.depth === 'mid'),
			NEAR: all.filter((p) => p.depth === 'near')
		};
	})();

	onMount(() => {
		if (!canvas) return;

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		if (reducedMotion.matches) return;

		let raf = 0;
		let pendingX = 0;
		let pendingY = 0;

		function onMove(e: MouseEvent) {
			if (!canvas) return;
			parallaxActive = true;
			const rect = canvas.getBoundingClientRect();
			pendingX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
			pendingY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
			if (!raf) raf = requestAnimationFrame(commit);
		}

		function commit() {
			raf = 0;
			canvas?.style.setProperty('--mouse-x', String(pendingX));
			canvas?.style.setProperty('--mouse-y', String(pendingY));
		}

		function onLeave() {
			pendingX = 0;
			pendingY = 0;
			parallaxActive = false;
			if (!raf) raf = requestAnimationFrame(commit);
		}

		canvas.addEventListener('mousemove', onMove, { passive: true });
		canvas.addEventListener('mouseleave', onLeave);

		return () => {
			canvas?.removeEventListener('mousemove', onMove);
			canvas?.removeEventListener('mouseleave', onLeave);
			if (raf) cancelAnimationFrame(raf);
		};
	});
</script>

<div bind:this={canvas} class="lk-auth" class:lk-parallax-active={parallaxActive}>
	<!-- ── Viewport-wide particle canvas (decorative, aria-hidden) ── -->
	<div class="lk-particles lk-particles--far" aria-hidden="true">
		{#each FAR as p (p.x + '-' + p.y)}
			<span
				class="lk-particle lk-particle--{p.colour}"
				style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s"
			></span>
		{/each}
	</div>
	<div class="lk-particles lk-particles--mid" aria-hidden="true">
		{#each MID as p (p.x + '-' + p.y)}
			<span
				class="lk-particle lk-particle--{p.colour}"
				style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s"
			></span>
		{/each}
	</div>
	<div class="lk-particles lk-particles--near" aria-hidden="true">
		{#each NEAR as p (p.x + '-' + p.y)}
			<span
				class="lk-particle lk-particle--{p.colour}"
				style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s"
			></span>
		{/each}
	</div>

	<!-- ── Mobile-only compact brand banner ── -->
	<header class="lk-auth-mobile-banner">
		<Logo size="md" />
		<span class="caption">Pharma SaaS</span>
	</header>

	<!-- ── Desktop split layout ── -->
	<div class="lk-auth-layout">
		<!-- Brand panel (desktop only) — no logo; the modal carries it. -->
		<section class="lk-auth-brand" aria-label="LeadKart">
			<!-- Decorative marketing — aria-hidden so screen-reader users
			     land on the form (the task), not on a feature pitch. -->
			<div class="lk-auth-brand-content" aria-hidden="true">
				<div class="lk-auth-content-washes"></div>

				<div class="lk-glass lk-glass--hero">
					<p class="display-2 leading-[1.05] tracking-tight text-[var(--color-brand-700)]">
						Pharma lead management,<br />simplified.
					</p>
				</div>

				<div class="lk-glass lk-glass--tagline">
					<p class="body-base text-[var(--color-fg-muted)]">
						End-to-end CRM, orders, inventory &amp; dispatch — built for India's PCD pharma market.
					</p>
				</div>

				<ul class="lk-auth-features">
					<li class="lk-glass lk-glass--feature lk-glass--purple">
						<span class="lk-auth-feature-icon lk-auth-feature-icon--purple">
							<ShieldCheck size={18} />
						</span>
						<span class="body-base">Enterprise-grade security</span>
					</li>
					<li class="lk-glass lk-glass--feature lk-glass--green">
						<span class="lk-auth-feature-icon lk-auth-feature-icon--green">
							<TrendingUp size={18} />
						</span>
						<span class="body-base">Real-time lead tracking</span>
					</li>
					<li class="lk-glass lk-glass--feature lk-glass--blue">
						<span class="lk-auth-feature-icon lk-auth-feature-icon--blue">
							<Truck size={18} />
						</span>
						<span class="body-base">Order-to-dispatch pipeline</span>
					</li>
				</ul>
			</div>

			<footer class="lk-auth-brand-footer caption">© LeadKart 2026</footer>
		</section>

		<!-- Form panel — the actual task -->
		<main class="lk-auth-form-panel">
			<div class="lk-auth-modal-wrap">
				{@render children()}
			</div>
		</main>
	</div>
</div>

<style>
	/* ─── Theme tokens — locked to light values regardless of OS theme.
	     Auth shells are brand-identity surfaces; they stay canonical.
	     We override existing semantic tokens (--color-bg / -bg-elevated)
	     rather than mint new ones, so modal + pills + canvas all inherit
	     the standard surface hierarchy without one-off names. ─── */
	.lk-auth {
		/* Canvas (--color-bg) — dulled off-white with a sliver of brand
		   tint. Modal + pills (--color-bg-elevated, pure white) lift off
		   it. Same semantic the global system uses, scoped tighter for
		   the auth aesthetic. */
		--color-bg: oklch(0.98 0.005 270);
		--color-bg-subtle: oklch(0.96 0.005 270);
		--color-bg-muted: oklch(0.94 0.005 270);
		--color-bg-elevated: oklch(1 0 0);
		--color-fg: oklch(0.2 0.02 256);
		--color-fg-muted: oklch(0.45 0.02 256);
		--color-fg-subtle: oklch(0.6 0.02 256);
		--color-border: oklch(0.9 0.01 256);
		--color-border-strong: oklch(0.8 0.01 256);

		/* Brand stops are derived DIRECTLY from the LeadKart logo asset
		   so the entire page reads as one colour family with the
		   wordmark — text matches wordmark, button matches the logo
		   "LK" mark, no orphan blues. */
		--color-brand-600: oklch(0.41 0.2 269); /* #3146a5 logo mark blue → button + links */
		--color-brand-700: oklch(
			0.33 0.1 296
		); /* #47356b logo wordmark dark → headings + body emphasis */
		--color-brand-800: oklch(0.27 0.09 296); /* derived darker wordmark stop */

		/* Logo palette — true asset colours, with on-light derivatives
		   where raw chroma fails AA contrast against white. */
		--color-logo-purple: oklch(0.58 0.18 305); /* #a05dce LK mark highlight */
		--color-logo-blue: oklch(0.41 0.2 269); /* #3146a5 LK mark base = brand-600 */
		--color-logo-green-on-light: oklch(0.55 0.21 142);

		--color-brand-heading: var(--color-brand-700);
		--color-brand-link: var(--color-brand-600);
		--color-brand-link-hover: var(--color-brand-700);

		/* ─── Root container layout ─── */
		position: relative;
		min-block-size: 100dvh;
		overflow: hidden;
		background: var(--color-bg);
		color: var(--color-fg);
	}

	/* ─── Mobile-only brand banner. ─── */
	.lk-auth-mobile-banner {
		position: relative;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-block: 1rem;
		padding-inline: clamp(1rem, 4vw, 1.5rem);
		border-block-end: 1px solid var(--color-border);
		background: var(--color-brand-50);
		color: var(--color-brand-700);
	}
	.lk-auth-mobile-banner .caption {
		color: var(--color-brand-700);
		font-weight: 500;
	}
	@media (min-width: 64rem) {
		.lk-auth-mobile-banner {
			display: none;
		}
	}

	/* ─── Two-column layout grid (single col on mobile). ─── */
	.lk-auth-layout {
		position: relative;
		z-index: 2;
		display: grid;
		grid-template-columns: 1fr;
		min-block-size: 100dvh;
	}
	@media (min-width: 64rem) {
		.lk-auth-layout {
			grid-template-columns: 1fr 1fr;
		}
	}

	/* ─── Brand panel — hidden on mobile (banner takes its place).
	     Content is vertically centred to match the form modal's
	     vertical centring on the right half; footer is pinned absolute
	     to the bottom-left corner. ─── */
	.lk-auth-brand {
		display: none;
	}
	@media (min-width: 64rem) {
		.lk-auth-brand {
			display: flex;
			flex-direction: column;
			justify-content: center;
			padding: clamp(2.5rem, 5vw, 4rem);
			position: relative;
		}
	}

	.lk-auth-brand-content {
		position: relative;
		z-index: 4;
		inline-size: 100%;
		max-inline-size: clamp(20rem, 32vw, 36rem);
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.lk-auth-brand-footer {
		position: absolute;
		inset-block-end: clamp(2.5rem, 5vw, 4rem);
		inset-inline-start: clamp(2.5rem, 5vw, 4rem);
		z-index: 4;
		color: var(--color-fg-subtle);
	}
	.lk-auth-brand-footer.caption {
		color: var(--color-fg-subtle);
	}

	/* ─── Form panel — hosts the modal, centred on both axes. ─── */
	.lk-auth-form-panel {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(1.5rem, 4vw, 3rem);
		position: relative;
	}

	.lk-auth-modal-wrap {
		inline-size: 100%;
		max-inline-size: min(28rem, 100%);
	}

	/* ─── Soft logo-palette washes behind the brand content stack —
	     gives the Liquid Glass pills colour to refract through. Two
	     washes only (blue right-side, green bottom-left) — the purple
	     wash that previously sat behind the hero pill was competing
	     with the hero text for attention, so it's been removed. ─── */
	.lk-auth-content-washes {
		position: absolute;
		inset: -10% -15%;
		z-index: -1;
		pointer-events: none;
		background:
			radial-gradient(
				ellipse 50% 55% at 90% 50%,
				color-mix(in srgb, var(--color-brand-600) 32%, transparent) 0%,
				transparent 75%
			),
			radial-gradient(
				ellipse 55% 45% at 20% 100%,
				color-mix(in srgb, var(--color-logo-green-on-light) 26%, transparent) 0%,
				transparent 70%
			);
		filter: blur(36px);
	}

	/* ─── Liquid Glass pill (iOS 26 design language) ─── */
	.lk-glass {
		position: relative;
		background: color-mix(in srgb, var(--color-bg-elevated) 60%, transparent);
		backdrop-filter: blur(20px) saturate(180%);
		-webkit-backdrop-filter: blur(20px) saturate(180%);
		border: 1px solid color-mix(in srgb, var(--color-bg-elevated) 60%, transparent);
		box-shadow:
			inset 0 1px 0 0 color-mix(in srgb, var(--color-bg-elevated) 80%, transparent),
			0 8px 24px color-mix(in srgb, var(--color-fg) 8%, transparent);
		overflow: hidden;
	}
	.lk-glass--hero {
		padding-block: 1.5rem;
		padding-inline: 1.75rem;
		border-radius: 1.5rem;
	}
	.lk-glass--tagline {
		padding-block: 1rem;
		padding-inline: 1.25rem;
		border-radius: 1.25rem;
	}
	.lk-glass--feature {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding-block: 0.625rem;
		padding-inline: 1rem 0.625rem;
		border-radius: 9999px;
	}
	.lk-glass--purple {
		background: color-mix(
			in srgb,
			var(--color-logo-purple) 28%,
			color-mix(in srgb, var(--color-bg-elevated) 60%, transparent)
		);
		border-color: color-mix(in srgb, var(--color-logo-purple) 40%, transparent);
	}
	.lk-glass--green {
		background: color-mix(
			in srgb,
			var(--color-logo-green-on-light) 24%,
			color-mix(in srgb, var(--color-bg-elevated) 60%, transparent)
		);
		border-color: color-mix(in srgb, var(--color-logo-green-on-light) 40%, transparent);
	}
	.lk-glass--blue {
		background: color-mix(
			in srgb,
			var(--color-brand-600) 24%,
			color-mix(in srgb, var(--color-bg-elevated) 60%, transparent)
		);
		border-color: color-mix(in srgb, var(--color-brand-600) 40%, transparent);
	}

	.lk-auth-features {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.lk-auth-feature-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		border-radius: 0.5rem;
		flex-shrink: 0;
	}
	.lk-auth-feature-icon--purple {
		background: color-mix(in srgb, var(--color-logo-purple) 22%, var(--color-bg-elevated));
		color: var(--color-logo-purple);
	}
	.lk-auth-feature-icon--green {
		background: color-mix(in srgb, var(--color-logo-green-on-light) 22%, var(--color-bg-elevated));
		color: var(--color-logo-green-on-light);
	}
	.lk-auth-feature-icon--blue {
		background: color-mix(in srgb, var(--color-brand-600) 20%, var(--color-bg-elevated));
		color: var(--color-brand-600);
	}

	/* ─── Particle canvas — three depth layers spanning the entire root.
	     Each layer responds to mouse parallax at a different amplitude;
	     near layer leads, far layer trails. ─── */
	.lk-particles {
		position: absolute;
		inset: 0;
		pointer-events: none;
		transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	.lk-parallax-active .lk-particles {
		will-change: transform;
	}
	.lk-particles--far {
		z-index: 0;
		transform: translate(calc(var(--mouse-x, 0) * 0.35rem), calc(var(--mouse-y, 0) * 0.35rem));
	}
	.lk-particles--mid {
		z-index: 1;
		transform: translate(calc(var(--mouse-x, 0) * 0.85rem), calc(var(--mouse-y, 0) * 0.85rem));
	}
	.lk-particles--near {
		z-index: 1;
		transform: translate(calc(var(--mouse-x, 0) * 1.6rem), calc(var(--mouse-y, 0) * 1.6rem));
	}

	.lk-particle {
		position: absolute;
		left: var(--x);
		top: var(--y);
		inline-size: var(--len);
		block-size: 2px;
		border-radius: 9999px;
		transform: rotate(var(--rot));
		opacity: 0.65;
		animation: lk-particle-drift 5s ease-in-out infinite;
		animation-delay: var(--delay);
	}
	.lk-particles--far .lk-particle {
		opacity: 0.42;
		transform: rotate(var(--rot)) scale(0.75);
	}
	.lk-particles--near .lk-particle {
		opacity: 0.85;
		block-size: 2.5px;
	}

	.lk-particle--neutral {
		background: color-mix(in srgb, var(--color-fg) 32%, transparent);
	}
	.lk-particle--purple {
		background: var(--color-logo-purple);
	}
	.lk-particle--blue {
		background: var(--color-logo-blue);
	}
	.lk-particle--green {
		background: var(--color-logo-green-on-light);
	}

	@keyframes lk-particle-drift {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -6px;
		}
	}

	/* ─── Motion-reduced fallback ─── */
	@media (prefers-reduced-motion: reduce) {
		.lk-particle {
			animation: none;
		}
		.lk-particles {
			transform: none;
		}
	}
</style>
