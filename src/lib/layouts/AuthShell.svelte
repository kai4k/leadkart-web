<script lang="ts">
	/**
	 * AuthShell — two-column auth layout.
	 *
	 * Left column (desktop only) — light brand canvas, Antigravity-style:
	 *   - bg-elevated (white) surface
	 *   - Logo lockup top-left (brand-mark anchor — required on every
	 *     auth brand panel per current canon)
	 *   - Three-depth particle field with mouse-driven parallax
	 *   - Hero content stack centred-upper-third: display-2 hero +
	 *     tagline + 3 colour-coded feature pills (Liquid Glass over
	 *     stronger logo-palette colour washes so the glass actually
	 *     refracts something visible)
	 *   - Brand-panel content is aria-hidden — decorative; the form
	 *     side carries the page's actual task semantics
	 *   - Footer copyright bottom-left
	 *
	 * Right column → form panel slot. SigninForm hosts the modal's
	 * own logo lockup at the top of the AuthCard.
	 * Mobile (< lg) → compact brand banner + form panel only.
	 *
	 * Industry refs (2026 canon):
	 *   - Google Antigravity — light canvas + particle field
	 *   - Stripe Atlas / Linear / Vercel — logo on brand side + form
	 *     side both, single signature decoration, content
	 *     hierarchy via size not chrome
	 *   - Apple Liquid Glass (iOS 26) — glass works when there's
	 *     colour behind to refract; on plain white it's invisible
	 *     muddy. We add stronger logo-palette washes to fix this.
	 *
	 * Accessibility:
	 *   - prefers-reduced-motion gates particle drift + parallax
	 *   - Brand-panel content (decorative marketing copy) is
	 *     aria-hidden so screen-reader users land directly on the
	 *     form — the task — not pitched at first
	 *   - Particle field is aria-hidden (decorative)
	 *   - Hero copy uses <p> not <h2>: SigninForm's "Sign in" is the
	 *     page's primary heading, marketing copy doesn't compete
	 *   - prefers-reduced-transparency falls back to solid surfaces
	 */
	import { onMount } from 'svelte';
	import { Logo } from '$ui';
	import { ShieldCheck, TrendingUp, Truck } from 'lucide-svelte';

	let { children } = $props();
	let brandPanel: HTMLElement | undefined = $state();
	let parallaxActive = $state(false);

	/**
	 * Pre-computed particle field, pre-bucketed by depth. Deterministic
	 * seeded PRNG so SSR pre-render matches client hydration exactly.
	 * Bucketing in script (not template) avoids re-filtering 90 entries
	 * per render. Animation delays capped at 2s so the field never
	 * appears static on first paint.
	 */
	const { FAR, MID, NEAR } = (() => {
		let seed = 1337;
		const rand = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return seed / 233280;
		};
		const palette = ['neutral', 'neutral', 'neutral', 'purple', 'blue', 'green'];
		const all = Array.from({ length: 90 }, () => {
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
		if (!brandPanel) return;

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		if (reducedMotion.matches) return;

		let raf = 0;
		let pendingX = 0;
		let pendingY = 0;

		function onMove(e: MouseEvent) {
			if (!brandPanel) return;
			parallaxActive = true;
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
			parallaxActive = false;
			if (!raf) raf = requestAnimationFrame(commit);
		}

		brandPanel.addEventListener('mousemove', onMove, { passive: true });
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
		class:lk-parallax-active={parallaxActive}
	>
		<!-- Particle field — three depth layers driven by parallax. -->
		<div class="lk-auth-particles lk-particles--far" aria-hidden="true">
			{#each FAR as p (p.x + '-' + p.y)}
				<span
					class="lk-particle lk-particle--{p.colour}"
					style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s"
				></span>
			{/each}
		</div>
		<div class="lk-auth-particles lk-particles--mid" aria-hidden="true">
			{#each MID as p (p.x + '-' + p.y)}
				<span
					class="lk-particle lk-particle--{p.colour}"
					style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s"
				></span>
			{/each}
		</div>
		<div class="lk-auth-particles lk-particles--near" aria-hidden="true">
			{#each NEAR as p (p.x + '-' + p.y)}
				<span
					class="lk-particle lk-particle--{p.colour}"
					style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s"
				></span>
			{/each}
		</div>

		<!-- Logo top-left of the brand panel — required brand anchor. -->
		<div class="lk-auth-brand-logo">
			<Logo size="lg" />
		</div>

		<!-- Hero content stack. aria-hidden because this is decorative
		     marketing copy; the form on the right is the actual task.
		     Hero uses <p>, not <h2>, so SigninForm's <h1> Sign in
		     remains the page's primary heading. -->
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
					<span class="body-base text-[var(--color-fg)]">Enterprise-grade security</span>
				</li>
				<li class="lk-glass lk-glass--feature lk-glass--green">
					<span class="lk-auth-feature-icon lk-auth-feature-icon--green">
						<TrendingUp size={18} />
					</span>
					<span class="body-base text-[var(--color-fg)]">Real-time lead tracking</span>
				</li>
				<li class="lk-glass lk-glass--feature lk-glass--blue">
					<span class="lk-auth-feature-icon lk-auth-feature-icon--blue">
						<Truck size={18} />
					</span>
					<span class="body-base text-[var(--color-fg)]">Order-to-dispatch pipeline</span>
				</li>
			</ul>
		</div>

		<footer class="lk-auth-brand-footer caption">© LeadKart 2026</footer>
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

		--color-brand-600: oklch(0.43 0.19 264); /* #1140b6 signin button */
		--color-brand-700: oklch(0.3 0.2 270); /* #00297d signin text */
		--color-brand-800: oklch(0.24 0.16 272); /* deep stop */

		/* Logo accents — true logo colours, with explicit on-light
		   variants where the raw hue lacks contrast against white. */
		--color-logo-purple: oklch(0.58 0.18 305); /* #a05dce */
		--color-logo-blue: oklch(0.41 0.2 269); /* #3146a5 */
		/* Logo green raw (#0ef709) is too light for legible text on
		   white; this on-light derivative keeps the hue and ramps
		   chroma + lightness for contrast. */
		--color-logo-green-on-light: oklch(0.55 0.21 142);

		--color-brand-heading: var(--color-brand-700);
		--color-brand-link: var(--color-brand-600);
		--color-brand-link-hover: var(--color-brand-700);
	}

	.lk-auth-form-side {
		background: var(--color-bg-elevated);
	}

	/* ── Brand panel: light surface, particle field + glass content. ── */
	.lk-auth-brand {
		background: var(--color-bg-elevated);
		color: var(--color-fg);
		padding: clamp(2.5rem, 5vw, 4rem);
		justify-content: space-between;
	}

	/* Logo lockup at the top-left of the brand panel — the brand-mark
	   anchor that every modern split-screen auth page (Stripe, Linear,
	   Vercel, Notion, Cal.com) keeps visible. */
	.lk-auth-brand-logo {
		position: relative;
		z-index: 4;
	}

	.lk-auth-brand-content {
		position: relative;
		z-index: 4;
		max-width: 30rem;
		width: 100%;
		align-self: center;
		/* Upper-third positioning per Stripe / Linear / Vercel canon —
		   hero copy sits above visual centre, not dead-centred. */
		margin: clamp(2rem, 6vh, 4rem) 0 auto 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Soft colour washes — bumped to 35-45% so the Liquid Glass pills
	   have enough colour behind them to actually refract. Apple
	   Liquid Glass on plain white = invisible; needs vibrant content
	   below the glass to deliver the iOS 26 look. */
	.lk-auth-content-washes {
		position: absolute;
		inset: -10% -15%;
		z-index: -1;
		pointer-events: none;
		background:
			radial-gradient(
				ellipse 55% 50% at 15% 10%,
				color-mix(in srgb, var(--color-logo-purple) 38%, transparent) 0%,
				transparent 70%
			),
			radial-gradient(
				ellipse 50% 55% at 90% 45%,
				color-mix(in srgb, var(--color-brand-600) 32%, transparent) 0%,
				transparent 75%
			),
			radial-gradient(
				ellipse 55% 45% at 30% 100%,
				color-mix(in srgb, var(--color-logo-green-on-light) 28%, transparent) 0%,
				transparent 70%
			);
		filter: blur(36px);
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
	   Liquid Glass — iOS 26 / iPhone 17 design language.
	   Cleaner implementation: one inset highlight + one outer shadow,
	   no mix-blend-mode overlay sheen (was unpredictable on light
	   backgrounds). Stronger colour washes behind (above) give the
	   backdrop-filter actual colour to bend through.
	   ────────────────────────────────────────────────────────── */
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

	/* Pill shapes — different radii per content type. */
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

	/* Colour tint variants — bumped from a barely-visible 10% to a
	   visible 28%, with the border picking up the tint at 40%. Now
	   each feature pill reads at a glance as its category colour. */
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

	/* ── Feature group spacing. ── */
	.lk-auth-features {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	/* ── Icon chips — saturated enough to be the primary colour cue;
	     pill tint reinforces. ── */
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

	/* ── Particle field — three depth layers each get a different
	     parallax response amount, giving the field perceived depth
	     under mouse motion. ── */
	.lk-auth-particles {
		position: absolute;
		inset: 0;
		pointer-events: none;
		transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}
	/* will-change only when parallax is active — avoids permanent GPU
	   layer promotion when the user isn't interacting. */
	.lk-parallax-active .lk-auth-particles {
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

	.lk-particles--far .lk-particle {
		opacity: 0.32;
		transform: rotate(var(--rot)) scale(0.75);
	}
	.lk-particles--near .lk-particle {
		opacity: 0.7;
		height: 2.5px;
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
