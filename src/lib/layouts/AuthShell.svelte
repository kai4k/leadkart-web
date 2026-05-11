<script lang="ts">
	/**
	 * AuthShell — two-column auth layout, Antigravity-style brand panel.
	 *
	 * Left column (desktop only) — light-canvas hero:
	 *   - bg-elevated (white) surface
	 *   - Particle field across the canvas (small oriented dashes in
	 *     logo accent colours — purple / green / blue / neutral) with
	 *     subtle drift animation + mouse-driven parallax
	 *   - Logo top-left (renders natively on the light surface — no
	 *     contrast issues vs the previous navy treatment)
	 *   - Hero block centred vertically: display-2 headline + tagline
	 *     + 3 feature rows (icon chip + label, no chrome)
	 *   - Footer copyright bottom-left
	 *
	 * Right column → form panel slot (existing white-card design).
	 * Mobile (< lg) → compact brand banner + form panel only.
	 *
	 * Industry refs:
	 *   - Google Antigravity homepage — light bg + particle field +
	 *     minimal text. The 2026 Google product-marketing canon.
	 *   - Vercel / Linear marketing — minimal hero, decorative motion
	 *     subordinate to typography
	 *
	 * Accessibility:
	 *   - prefers-reduced-motion gates particle drift + parallax
	 *   - Particle field is aria-hidden (decorative)
	 *   - All hero meaning carried by typography
	 */
	import { onMount } from 'svelte';
	import { Logo } from '$ui';
	import { ShieldCheck, TrendingUp, Truck } from 'lucide-svelte';

	let { children } = $props();
	let brandPanel: HTMLElement | undefined = $state();

	/**
	 * Pre-computed particle field. Deterministic seeded PRNG so SSR
	 * pre-render matches client hydration exactly (no flicker, no
	 * hydration mismatch warnings). 90 particles spread across the
	 * canvas.
	 */
	const PARTICLES = (() => {
		let seed = 1337;
		const rand = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return seed / 233280;
		};
		// Colour weighting: more neutrals than brand accents, so the
		// brand colours read as deliberate accent moments, not visual
		// noise. Weighted via repetition in this array.
		const palette = ['neutral', 'neutral', 'neutral', 'purple', 'blue', 'green'];
		return Array.from({ length: 90 }, () => ({
			x: rand() * 100,
			y: rand() * 100,
			length: 4 + rand() * 8,
			rotation: rand() * 360,
			colour: palette[Math.floor(rand() * palette.length)],
			delay: rand() * 8,
			depth: rand() < 0.4 ? 'far' : rand() < 0.7 ? 'mid' : 'near'
		}));
	})();

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
		<!-- Particle field — three depth layers driven by parallax. -->
		<div class="lk-auth-particles lk-particles--far" aria-hidden="true">
			{#each PARTICLES.filter((p) => p.depth === 'far') as p (p.x + '-' + p.y)}
				<span
					class="lk-particle lk-particle--{p.colour}"
					style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s"
				></span>
			{/each}
		</div>
		<div class="lk-auth-particles lk-particles--mid" aria-hidden="true">
			{#each PARTICLES.filter((p) => p.depth === 'mid') as p (p.x + '-' + p.y)}
				<span
					class="lk-particle lk-particle--{p.colour}"
					style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s"
				></span>
			{/each}
		</div>
		<div class="lk-auth-particles lk-particles--near" aria-hidden="true">
			{#each PARTICLES.filter((p) => p.depth === 'near') as p (p.x + '-' + p.y)}
				<span
					class="lk-particle lk-particle--{p.colour}"
					style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s"
				></span>
			{/each}
		</div>

		<!-- Hero text block — Liquid Glass pills decorating each
		     content unit. Subtle radial colour washes behind give the
		     backdrop-filter something to refract (glass on plain white
		     would be invisible). -->
		<div class="lk-auth-brand-content">
			<div class="lk-auth-content-washes" aria-hidden="true"></div>

			<div class="lk-glass lk-glass--hero">
				<h2 class="display-2 leading-[1.05] tracking-tight text-[var(--color-brand-700)]">
					Pharma lead management,<br />simplified.
				</h2>
			</div>

			<div class="lk-glass lk-glass--tagline">
				<p class="body-base text-[var(--color-fg-muted)]">
					End-to-end CRM, orders, inventory &amp; dispatch — built for India's PCD pharma market.
				</p>
			</div>

			<ul class="lk-auth-features">
				<li class="lk-glass lk-glass--feature lk-glass--purple">
					<span class="lk-auth-feature-icon lk-auth-feature-icon--purple" aria-hidden="true">
						<ShieldCheck size={18} />
					</span>
					<span class="body-base text-[var(--color-fg)]">Enterprise-grade security</span>
				</li>
				<li class="lk-glass lk-glass--feature lk-glass--green">
					<span class="lk-auth-feature-icon lk-auth-feature-icon--green" aria-hidden="true">
						<TrendingUp size={18} />
					</span>
					<span class="body-base text-[var(--color-fg)]">Real-time lead tracking</span>
				</li>
				<li class="lk-glass lk-glass--feature lk-glass--blue">
					<span class="lk-auth-feature-icon lk-auth-feature-icon--blue" aria-hidden="true">
						<Truck size={18} />
					</span>
					<span class="body-base text-[var(--color-fg)]">Order-to-dispatch pipeline</span>
				</li>
			</ul>
		</div>

		<footer class="lk-auth-brand-footer caption">© LeadKart 2026</footer>
	</section>

	<!-- ═══ FORM PANEL — logo lives inside the AuthCard (SigninForm) ═══ -->
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

		--color-brand-600: oklch(0.43 0.19 264); /* #1140b6 signin button */
		--color-brand-700: oklch(0.3 0.2 270); /* #00297d signin text */
		--color-brand-800: oklch(0.24 0.16 272); /* deep stop */

		--color-logo-purple: oklch(0.58 0.18 305); /* #a05dce */
		--color-logo-green: oklch(0.65 0.21 142); /* #0ef709 (toned down for legibility on white) */
		--color-logo-blue: oklch(0.41 0.2 269); /* #3146a5 */

		--color-brand-heading: var(--color-brand-700);
		--color-brand-link: var(--color-brand-600);
		--color-brand-link-hover: var(--color-brand-700);
	}

	.lk-auth-form-side {
		background: var(--color-bg-elevated);
	}

	/* ── Brand panel: light surface, particle field decoration. ── */
	.lk-auth-brand {
		background: var(--color-bg-elevated);
		color: var(--color-fg);
		padding: clamp(2.5rem, 5vw, 4rem);
		justify-content: space-between;
	}

	.lk-auth-brand-header {
		position: relative;
		z-index: 4;
	}

	.lk-auth-brand-content {
		position: relative;
		z-index: 4;
		max-width: 30rem;
		width: 100%;
		align-self: center;
		/* Shift the content stack toward upper third instead of dead-
		   centred — modern split-screen auth pages (Stripe / Linear /
		   Vercel) all position hero copy above visual centre. */
		margin: clamp(3rem, 8vh, 6rem) 0 auto 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ── Soft colour washes behind the content stack — gives the
	     Liquid Glass pills something colourful to refract through.
	     On pure white the backdrop-filter would be invisible. ── */
	.lk-auth-content-washes {
		position: absolute;
		inset: -8% -12%;
		z-index: -1;
		pointer-events: none;
		background:
			radial-gradient(
				ellipse 60% 50% at 20% 15%,
				color-mix(in srgb, var(--color-logo-purple) 22%, transparent) 0%,
				transparent 70%
			),
			radial-gradient(
				ellipse 50% 55% at 85% 45%,
				color-mix(in srgb, var(--color-brand-600) 18%, transparent) 0%,
				transparent 75%
			),
			radial-gradient(
				ellipse 55% 45% at 30% 95%,
				color-mix(in srgb, var(--color-logo-green) 16%, transparent) 0%,
				transparent 70%
			);
		filter: blur(28px);
	}

	.lk-auth-brand-footer {
		position: relative;
		z-index: 4;
		color: var(--color-fg-subtle);
	}
	.lk-auth-brand-footer.caption {
		color: var(--color-fg-subtle);
	}

	/* ──────────────────────────────────────────────────────────────
	   Liquid Glass — iOS 26 / iPhone 17 design language ported to web.
	   Translucent white fill + heavy backdrop-blur with saturation
	   boost (the saturate(180%) is what makes the glass feel "lively"
	   not flat), inset top-edge highlight to simulate refraction,
	   soft drop shadow for floating depth. Generous border-radius.
	   Variants tint the fill toward a logo accent for the feature
	   rows. ────────────────────────────────────────────────────── */
	.lk-glass {
		position: relative;
		background: color-mix(in srgb, var(--color-bg-elevated) 55%, transparent);
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
		border: 1px solid color-mix(in srgb, var(--color-bg-elevated) 50%, transparent);
		box-shadow:
			inset 0 1px 0 0 color-mix(in srgb, white 75%, transparent),
			inset 0 0 0 1px color-mix(in srgb, white 12%, transparent),
			0 1px 2px color-mix(in srgb, black 6%, transparent),
			0 8px 32px color-mix(in srgb, black 8%, transparent);
		overflow: hidden;
	}

	/* Refraction sheen — a soft top-edge highlight that sells the
	   "real glass" illusion. Sits above the content but below text. */
	.lk-glass::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, white 32%, transparent) 0%,
			transparent 25%,
			transparent 75%,
			color-mix(in srgb, white 8%, transparent) 100%
		);
		pointer-events: none;
		mix-blend-mode: overlay;
	}

	/* Pill shapes — different radii for different content shapes. */
	.lk-glass--hero {
		padding: 1.5rem 1.75rem;
		border-radius: 1.5rem;
	}
	.lk-glass--tagline {
		padding: 1rem 1.25rem;
		border-radius: 1.25rem;
	}
	.lk-glass--feature {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.625rem 1rem 0.625rem 0.625rem;
		border-radius: 9999px;
	}

	/* Coloured tint variants — used on the feature-row pills so each
	   reads as the category colour at a glance. Tint sits over the
	   base white-mix, giving a subtle hue without sacrificing legibility. */
	.lk-glass--purple {
		background: color-mix(
			in srgb,
			var(--color-logo-purple) 10%,
			color-mix(in srgb, var(--color-bg-elevated) 55%, transparent)
		);
	}
	.lk-glass--green {
		background: color-mix(
			in srgb,
			var(--color-logo-green) 10%,
			color-mix(in srgb, var(--color-bg-elevated) 55%, transparent)
		);
	}
	.lk-glass--blue {
		background: color-mix(
			in srgb,
			var(--color-brand-600) 10%,
			color-mix(in srgb, var(--color-bg-elevated) 55%, transparent)
		);
	}

	/* ── Feature rows — icon chip + label, colour-coded by category.
	     Logo-derived accents: purple (security), green (growth/leads),
	     blue (logistics/dispatch). ── */
	.lk-auth-features {
		list-style: none;
		padding: 0;
		/* A bit of extra space above the feature group to separate it
		   from the tagline pill — the tagline is the headline's
		   continuation, the features are a distinct content unit. */
		margin: 0.75rem 0 0 0;
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
		flex-shrink: 0;
	}
	.lk-auth-feature-icon--purple {
		background: color-mix(in srgb, var(--color-logo-purple) 14%, white);
		color: var(--color-logo-purple);
	}
	.lk-auth-feature-icon--green {
		background: color-mix(in srgb, var(--color-logo-green) 14%, white);
		color: color-mix(in srgb, var(--color-logo-green) 88%, black);
	}
	.lk-auth-feature-icon--blue {
		background: color-mix(in srgb, var(--color-brand-600) 12%, white);
		color: var(--color-brand-600);
	}

	/* ── Particle field — three depth layers each get a different
	     parallax response amount, giving the field perceived depth
	     under mouse motion (Antigravity hero canon). ── */
	.lk-auth-particles {
		position: absolute;
		inset: 0;
		pointer-events: none;
		will-change: transform;
		transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
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
		z-index: 2;
		transform: translate(calc(var(--mouse-x, 0) * 1.6rem), calc(var(--mouse-y, 0) * 1.6rem));
	}

	.lk-particle {
		position: absolute;
		left: var(--x);
		top: var(--y);
		width: var(--len);
		height: 2px;
		border-radius: 9999px;
		transform: rotate(var(--rot));
		opacity: 0.5;
		animation: lk-particle-drift 6s ease-in-out infinite;
		animation-delay: var(--delay);
	}

	/* Depth tweaks — near particles are slightly larger + more opaque
	   than far ones, reinforcing the parallax layering. */
	.lk-particles--far .lk-particle {
		opacity: 0.35;
		transform: rotate(var(--rot)) scale(0.75);
	}
	.lk-particles--near .lk-particle {
		opacity: 0.7;
		height: 2.5px;
	}

	.lk-particle--neutral {
		background: color-mix(in srgb, var(--color-fg) 35%, transparent);
	}
	.lk-particle--purple {
		background: var(--color-logo-purple);
	}
	.lk-particle--blue {
		background: var(--color-logo-blue);
	}
	.lk-particle--green {
		background: color-mix(in srgb, var(--color-logo-green) 90%, black);
	}

	@keyframes lk-particle-drift {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -3px;
		}
	}

	/* ── Reduced motion ── */
	@media (prefers-reduced-motion: reduce) {
		.lk-particle {
			animation: none;
		}
		.lk-particles--far,
		.lk-particles--mid,
		.lk-particles--near {
			transform: none;
		}
	}
</style>
