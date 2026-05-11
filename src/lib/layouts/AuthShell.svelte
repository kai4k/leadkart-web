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

	/**
	 * Scattered pharma-particle field. Random x / y across the viewport,
	 * random rotation, depth distributed roughly 40% far / 30% mid /
	 * 30% near (smaller, fainter particles dominate the bg).
	 *
	 * Deterministic seeded PRNG → SSR pre-render byte-identical to
	 * client hydration.
	 *
	 * Each particle carries two colour tokens (--c1 / --c2) so pills +
	 * tracers render as two-tone capsules; tablets + crosses use --c1
	 * only. Crosses are always medical red (signal colour); tablets
	 * pick from the branded single-tone palette.
	 */
	const { FAR, MID, NEAR } = (() => {
		let seed = 7919;
		const rand = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return seed / 233280;
		};
		const pillPairs: Array<[string, string]> = [
			['--color-logo-purple', '--color-brand-600'],
			['--color-brand-600', '--color-logo-green-on-light'],
			['--color-logo-purple', '--color-logo-green-on-light'],
			['--color-fg', '--color-logo-purple'],
			['--color-fg-muted', '--color-brand-600'],
			['--color-logo-green-on-light', '--color-fg']
		];
		const tabletColours = [
			'--color-logo-purple',
			'--color-brand-600',
			'--color-logo-green-on-light',
			'--color-fg'
		];

		const all = Array.from({ length: 90 }, () => {
			const d = rand();
			const k = rand();
			const kind = k < 0.15 ? 'cross' : k < 0.3 ? 'tablet' : k < 0.45 ? 'tracer' : 'pill';
			let c1: string;
			let c2: string;
			if (kind === 'cross') {
				c1 = '--color-medical-red';
				c2 = c1;
			} else if (kind === 'tablet') {
				c1 = tabletColours[Math.floor(rand() * tabletColours.length)];
				c2 = c1;
			} else {
				const pair = pillPairs[Math.floor(rand() * pillPairs.length)];
				c1 = pair[0];
				c2 = pair[1];
			}
			return {
				x: rand() * 100,
				y: rand() * 100,
				length: 6 + rand() * 8,
				rotation: rand() * 360,
				delay: rand() * 2,
				depth: d < 0.4 ? 'far' : d < 0.7 ? 'mid' : 'near',
				kind,
				c1,
				c2
			};
		});
		return {
			FAR: all.filter((p) => p.depth === 'far'),
			MID: all.filter((p) => p.depth === 'mid'),
			NEAR: all.filter((p) => p.depth === 'near')
		};
	})();

	/**
	 * Disperse-on-mouse-move interaction. Each particle within a
	 * percent-of-viewport threshold of the cursor gets pushed radially
	 * outward via `--push-x` / `--push-y` CSS vars (consumed by the
	 * particle's transform). Smooth return via CSS transition when
	 * the cursor moves away.
	 */
	onMount(() => {
		if (!canvas) return;

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		if (reducedMotion.matches) return;

		const particleEls = canvas.querySelectorAll<HTMLElement>('.lk-particle');
		let raf = 0;
		let mx = -1000;
		let my = -1000;
		const THRESHOLD = 14; // percent of viewport — disperse radius
		const MAX_PUSH = 3; // vw — strongest push at distance 0

		function onMove(e: MouseEvent) {
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			mx = ((e.clientX - rect.left) / rect.width) * 100;
			my = ((e.clientY - rect.top) / rect.height) * 100;
			if (!raf) raf = requestAnimationFrame(commit);
		}

		function commit() {
			raf = 0;
			const tSq = THRESHOLD * THRESHOLD;
			for (let i = 0; i < particleEls.length; i++) {
				const el = particleEls[i];
				const px = parseFloat(el.style.getPropertyValue('--x'));
				const py = parseFloat(el.style.getPropertyValue('--y'));
				const dx = px - mx;
				const dy = py - my;
				const distSq = dx * dx + dy * dy;
				if (distSq < tSq) {
					const dist = Math.sqrt(distSq);
					const safe = Math.max(0.5, dist);
					const strength = (1 - dist / THRESHOLD) * MAX_PUSH;
					el.style.setProperty('--push-x', `${((dx / safe) * strength).toFixed(2)}vw`);
					el.style.setProperty('--push-y', `${((dy / safe) * strength).toFixed(2)}vw`);
				} else if (el.style.getPropertyValue('--push-x') !== '0vw') {
					el.style.setProperty('--push-x', '0vw');
					el.style.setProperty('--push-y', '0vw');
				}
			}
		}

		function onLeave() {
			// Park the cursor far off-canvas so every particle exits the
			// threshold and resets to base position via the transition.
			mx = -1000;
			my = -1000;
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

<div bind:this={canvas} class="lk-auth">
	<!-- ── Ambient colour blobs — soft, heavily blurred, slow drift.
	     Logo-palette tints. Sits behind the particle canvas to give
	     subtle depth + colour movement across the whole viewport. ── -->
	<div class="lk-auth-blobs" aria-hidden="true">
		<span class="lk-blob lk-blob--purple"></span>
		<span class="lk-blob lk-blob--blue"></span>
		<span class="lk-blob lk-blob--green"></span>
		<span class="lk-blob lk-blob--purple-sm"></span>
	</div>

	<!-- ── Viewport-wide particle canvas (decorative, aria-hidden) ── -->
	<div class="lk-particles lk-particles--far" aria-hidden="true">
		{#each FAR as p (p.x + '-' + p.y)}
			<span
				class="lk-particle lk-particle--{p.kind}"
				style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s;--c1:var({p.c1});--c2:var({p.c2});"
			></span>
		{/each}
	</div>
	<div class="lk-particles lk-particles--mid" aria-hidden="true">
		{#each MID as p (p.x + '-' + p.y)}
			<span
				class="lk-particle lk-particle--{p.kind}"
				style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s;--c1:var({p.c1});--c2:var({p.c2});"
			></span>
		{/each}
	</div>
	<div class="lk-particles lk-particles--near" aria-hidden="true">
		{#each NEAR as p (p.x + '-' + p.y)}
			<span
				class="lk-particle lk-particle--{p.kind}"
				style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s;--c1:var({p.c1});--c2:var({p.c2});"
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
		/* Canvas (--color-bg) — soft off-white with a faint brand-blue
		   tint. Industry canon for low-fatigue B2B surfaces uses 95-97%
		   lightness, not pure 100%:
		      Stripe Dashboard   #f6f9fc  (96% L, cool blue tint)
		      GitHub             #f6f8fa  (96% L, cool blue tint)
		      iOS Tertiary System #f2f2f7 (95% L, cool gray)
		      Vercel             #fafafa  (98% L, true gray)
		   Pure white (oklch 1 0 0) at full screen brightness creates
		   glare on prolonged reading; 4 percentage points off white is
		   the standard remedy. Brand-violet hue (268) keeps it tonally
		   tied to the rest of the surface palette without reading as
		   "tinted".
		   Modal + pills (--color-bg-elevated) stay pure white so they
		   lift visibly off the canvas. */
		--color-bg: oklch(0.96 0.008 268);
		--color-bg-subtle: oklch(0.93 0.008 268);
		--color-bg-muted: oklch(0.9 0.008 268);
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
		/* Medical-cross red — iconic pharma signal colour. Used only on
		   the cross-shaped particles so the medical-plus reads as a
		   canonical red cross, not just another branded shape. */
		--color-medical-red: oklch(0.58 0.22 27);

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
		z-index: 4;
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

	/* ─── Two-column layout grid (single col on mobile). z-index 5 keeps
	     content above the entire decoration stack: blobs (0) + particles
	     (1-3) + mobile banner (4). ─── */
	.lk-auth-layout {
		position: relative;
		z-index: 5;
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

	/* ─── Ambient colour blobs — soft, heavily blurred, slow drift.
	     Four blobs in logo-palette colours floating slowly across the
	     canvas. Sits at z-index 0 (deepest decoration), behind particles.
	     Each blob has its own non-synchronised drift period so the
	     overall motion never repeats visibly. ─── */
	.lk-auth-blobs {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
	}
	.lk-blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		will-change: transform;
	}
	.lk-blob--purple {
		inline-size: 28rem;
		block-size: 28rem;
		top: -10%;
		left: -8%;
		background: color-mix(in srgb, var(--color-logo-purple) 55%, transparent);
		animation: lk-blob-drift-a 30s ease-in-out infinite;
	}
	.lk-blob--blue {
		inline-size: 32rem;
		block-size: 32rem;
		top: 20%;
		right: -14%;
		background: color-mix(in srgb, var(--color-brand-600) 45%, transparent);
		animation: lk-blob-drift-b 36s ease-in-out infinite;
	}
	.lk-blob--green {
		inline-size: 26rem;
		block-size: 26rem;
		bottom: -10%;
		left: 18%;
		background: color-mix(in srgb, var(--color-logo-green-on-light) 40%, transparent);
		animation: lk-blob-drift-c 32s ease-in-out infinite;
	}
	.lk-blob--purple-sm {
		inline-size: 18rem;
		block-size: 18rem;
		top: 45%;
		left: 40%;
		background: color-mix(in srgb, var(--color-logo-purple) 32%, transparent);
		animation: lk-blob-drift-d 28s ease-in-out infinite;
	}

	@keyframes lk-blob-drift-a {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 5rem 4rem;
		}
	}
	@keyframes lk-blob-drift-b {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: -5rem 6rem;
		}
	}
	@keyframes lk-blob-drift-c {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 5rem -4rem;
		}
	}
	@keyframes lk-blob-drift-d {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 4rem -5rem;
		}
	}

	/* ─── Particle canvas — three depth layers spanning the entire root.
	     Each layer responds to mouse parallax at a different amplitude;
	     near layer leads, far layer trails. ─── */
	.lk-particles {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	/* Depth layers — z-index only (parallax translate replaced by the
	   bloom spotlight). Particles remain static besides their ambient
	   drift animation. */
	.lk-particles--far {
		z-index: 1;
	}
	.lk-particles--mid {
		z-index: 2;
	}
	.lk-particles--near {
		z-index: 3;
	}

	/* ─── Pharma-themed particle shapes ─────────────────────────────
	     Each particle carries --c1 / --c2 inline (set by the template
	     from the deterministic PRNG output).
	       .lk-particle--pill   → two-tone capsule with centre seam +
	                              top gloss highlight (3D pharma look)
	       .lk-particle--tracer → longer two-tone capsule with same
	                              treatment
	       .lk-particle--cross  → medical plus sign via SVG mask,
	                              single-coloured from --c1
	   ─────────────────────────────────────────────────────────── */
	.lk-particle {
		position: absolute;
		left: var(--x);
		top: var(--y);
		--scale: 1;
		--push-x: 0vw;
		--push-y: 0vw;
		inline-size: var(--len);
		block-size: 3.5px;
		border-radius: 9999px;
		transform: rotate(var(--rot)) translate(var(--push-x), var(--push-y)) scale(var(--scale));
		transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
		opacity: 0.85;
		animation: lk-particle-drift 5s ease-in-out infinite;
		animation-delay: var(--delay);
	}
	.lk-particles--far .lk-particle {
		--scale: 0.85;
		opacity: 0.6;
		block-size: 2.5px;
	}
	.lk-particles--near .lk-particle {
		opacity: 1;
		block-size: 4.5px;
	}

	/* Capsule pill — two-tone with a centre seam, like an actual
	   gelatin capsule. Two halves of different brand colours separated
	   by a thin dark seam (color-mixed from --color-fg). */
	.lk-particle--pill,
	.lk-particle--tracer {
		background: linear-gradient(
			90deg,
			var(--c1) 0%,
			var(--c1) 49%,
			color-mix(in srgb, var(--color-fg) 35%, transparent) 49.5%,
			color-mix(in srgb, var(--color-fg) 35%, transparent) 50.5%,
			var(--c2) 51%,
			var(--c2) 100%
		);
	}

	/* Gloss highlight — a curved top sheen that sells the 3D capsule
	   illusion. Pseudo-element inset 0 over the pill, gradient of
	   bg-elevated fading to transparent. */
	.lk-particle--pill::after,
	.lk-particle--tracer::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--color-bg-elevated) 50%, transparent) 0%,
			color-mix(in srgb, var(--color-bg-elevated) 15%, transparent) 35%,
			transparent 65%
		);
		pointer-events: none;
	}

	/* Tracer = long capsule — eye-catching streak. */
	.lk-particle--tracer {
		inline-size: calc(var(--len) * 2);
		block-size: 4.5px;
	}
	.lk-particles--far .lk-particle--tracer {
		block-size: 3.5px;
	}
	.lk-particles--near .lk-particle--tracer {
		block-size: 5.5px;
	}

	/* Medical plus / cross — single-colour, mask-shaped. The bg colour
	   comes from --c1 (set inline); the SVG mask cuts it to a +. */
	.lk-particle--cross {
		inline-size: 9px;
		block-size: 9px;
		border-radius: 0;
		background: var(--c1);
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M4 0h2v4h4v2H6v4H4V6H0V4h4z'/%3E%3C/svg%3E");
		-webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M4 0h2v4h4v2H6v4H4V6H0V4h4z'/%3E%3C/svg%3E");
		mask-size: contain;
		-webkit-mask-size: contain;
		mask-repeat: no-repeat;
		-webkit-mask-repeat: no-repeat;
	}
	.lk-particles--far .lk-particle--cross {
		inline-size: 7px;
		block-size: 7px;
	}
	.lk-particles--near .lk-particle--cross {
		inline-size: 11px;
		block-size: 11px;
	}

	/* Tablet = round disc with a centre score line — the classic
	   pressed-tablet shape. Single-coloured from --c1, with a score
	   ::before line and a gloss ::after dome highlight. */
	.lk-particle--tablet {
		inline-size: 8px;
		block-size: 8px;
		border-radius: 50%;
		background: var(--c1);
	}
	.lk-particles--far .lk-particle--tablet {
		inline-size: 6px;
		block-size: 6px;
	}
	.lk-particles--near .lk-particle--tablet {
		inline-size: 10px;
		block-size: 10px;
	}
	.lk-particle--tablet::before {
		content: '';
		position: absolute;
		inset-block-start: 50%;
		inset-inline: 22%;
		block-size: 1px;
		background: color-mix(in srgb, var(--color-fg) 40%, transparent);
		transform: translateY(-50%);
	}
	.lk-particle--tablet::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--color-bg-elevated) 50%, transparent) 0%,
			color-mix(in srgb, var(--color-bg-elevated) 15%, transparent) 35%,
			transparent 60%
		);
		pointer-events: none;
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
		.lk-particle,
		.lk-blob {
			animation: none;
		}
		.lk-particles {
			transform: none;
		}
	}
</style>
