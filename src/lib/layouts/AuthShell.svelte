<script lang="ts">
	/**
	 * AuthShell — two-column auth layout, Antigravity / Gemini style.
	 *
	 * Left column (desktop only) — single-intent hero canvas:
	 *   - Deep brand-900 / near-black background
	 *   - One animated mesh-gradient orb (logo palette: purple / green
	 *     / blue radial stops, slow rotation + counter-rotation)
	 *   - Concentric orbit rings (subtle, ambient)
	 *   - Minimal text: logo top-left, one-line hero bottom-left,
	 *     footer at the bottom edge
	 *   - Mouse-driven drift on the orb (subtle follow, smooth easing)
	 *
	 * No illustration. No feature list. No floating product cards. No
	 * pills. The hero IS the orb — one visual idea, executed cleanly.
	 *
	 * Right column → form panel slot (white card on bg-elevated).
	 * Mobile (< lg) → compact brand banner + form panel only.
	 *
	 * Industry refs:
	 *   - Google Antigravity (antigravity.google) — single mesh-orb hero
	 *     on deep navy, minimal text overlay, custom scroll
	 *   - Gemini product surfaces — mesh-gradient sphere as primary
	 *     identity element
	 *   - Vercel / Linear marketing — single visual intent per surface
	 *
	 * Accessibility:
	 *   - prefers-reduced-motion gates the orb rotation + parallax
	 *   - Orb is aria-hidden (decorative)
	 *   - All hero meaning carried by the text + logo, not the orb
	 */
	import { onMount } from 'svelte';
	import { Logo } from '$ui';

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

	<!-- ═══ BRAND PANEL (desktop only) — Antigravity-style hero ═══════ -->
	<section
		bind:this={brandPanel}
		aria-label="LeadKart"
		class="lk-auth-brand relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between"
	>
		<!-- Logo top-left -->
		<header class="lk-auth-brand-header">
			<Logo size="xl" />
		</header>

		<!-- Mesh-gradient orb hero. Three concentric layers compose
		     the visual: outer orbit ring → mid orbit ring → mesh
		     orb itself. All decorative (aria-hidden). -->
		<div class="lk-auth-orb-stage lk-orb-drift" aria-hidden="true">
			<div class="lk-auth-orb-ring lk-auth-orb-ring--outer"></div>
			<div class="lk-auth-orb-ring lk-auth-orb-ring--inner"></div>
			<div class="lk-auth-orb">
				<div class="lk-auth-orb-mesh"></div>
				<div class="lk-auth-orb-highlight"></div>
			</div>
		</div>

		<!-- Hero text bottom-left, footer below. One sentence, nothing else. -->
		<div class="lk-auth-brand-foot">
			<h2 class="lk-auth-hero text-white">
				Pharma lead management,<br />simplified.
			</h2>
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
	/* ── AuthShell-wide THEME LOCK to light values (form side). ── */
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

		/* Brand stops — pinned to LeadKart logo + signin spec. */
		--color-brand-600: oklch(0.43 0.19 264); /* #1140b6 signin button */
		--color-brand-700: oklch(0.3 0.2 270); /* #00297d signin text */
		--color-brand-800: oklch(0.24 0.16 272); /* mid brand-panel surface */

		/* Logo accents — the orb mesh stops. */
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

	/* ── Brand panel: near-black canvas, vignette wash from centre.
	     Single intent: hero the orb. ── */
	.lk-auth-brand {
		padding: clamp(2.5rem, 5vw, 4rem);
		background:
			radial-gradient(
				ellipse 80% 60% at 50% 50%,
				color-mix(in srgb, var(--color-logo-blue) 18%, transparent) 0%,
				transparent 70%
			),
			oklch(0.12 0.04 270);
		color: var(--color-bg-elevated);
	}

	.lk-auth-brand-header {
		position: relative;
		z-index: 4;
	}

	.lk-auth-brand-foot {
		position: relative;
		z-index: 4;
		display: flex;
		flex-direction: column;
		gap: clamp(1.5rem, 3vh, 2.25rem);
	}

	.lk-auth-hero {
		font-size: clamp(2rem, 3.4vw, 3rem);
		line-height: 1.05;
		font-weight: 700;
		letter-spacing: -0.02em;
		max-width: 28rem;
	}

	.lk-auth-brand-footer {
		opacity: 0.45;
		color: var(--color-bg-elevated);
	}
	.lk-auth-brand-footer.caption {
		color: var(--color-bg-elevated);
	}

	/* ── Mesh-gradient orb stage ────────────────────────────────────
	     Centred absolutely behind the foreground text. The stage gets
	     the cursor drift (translate); inside it the orb + rings
	     counter-rotate at different speeds for an organic flow.
	     ─────────────────────────────────────────────────────────── */
	.lk-auth-orb-stage {
		position: absolute;
		top: 50%;
		left: 50%;
		width: min(46vh, 38vw);
		aspect-ratio: 1 / 1;
		transform: translate(-50%, -50%);
		z-index: 1;
		pointer-events: none;
	}

	/* Mouse-driven drift on the orb stage. Smooth easing back to centre
	   on leave (the parallax handler resets vars to 0). */
	.lk-orb-drift {
		transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		transform: translate(
			calc(-50% + var(--mouse-x, 0) * 1.25rem),
			calc(-50% + var(--mouse-y, 0) * 1.25rem)
		);
		will-change: transform;
	}

	/* The orb itself — radial mesh of logo accents, soft blurred. */
	.lk-auth-orb {
		position: absolute;
		inset: 12%;
		border-radius: 50%;
		background:
			radial-gradient(
				circle at 28% 28%,
				color-mix(in srgb, var(--color-logo-purple) 90%, transparent) 0%,
				transparent 50%
			),
			radial-gradient(
				circle at 72% 32%,
				color-mix(in srgb, var(--color-logo-blue) 85%, transparent) 0%,
				transparent 55%
			),
			radial-gradient(
				circle at 50% 78%,
				color-mix(in srgb, var(--color-logo-green) 70%, transparent) 0%,
				transparent 55%
			),
			radial-gradient(
				circle at center,
				color-mix(in srgb, var(--color-brand-600) 80%, transparent) 0%,
				color-mix(in srgb, var(--color-brand-700) 90%, transparent) 70%
			);
		filter: blur(28px) saturate(1.15);
		animation: lk-orb-spin 32s linear infinite;
	}

	/* Specular highlight on top of the orb — gives the impression of
	   a glossy sphere with a top-left light source. */
	.lk-auth-orb-highlight {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: radial-gradient(
			ellipse 60% 50% at 30% 22%,
			color-mix(in srgb, var(--color-bg-elevated) 22%, transparent) 0%,
			transparent 55%
		);
		filter: blur(4px);
		mix-blend-mode: screen;
		pointer-events: none;
	}

	/* Inner mesh layer rotating opposite direction at a different
	   period — creates non-repeating colour flow at the surface. */
	.lk-auth-orb-mesh {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background:
			radial-gradient(
				circle at 70% 70%,
				color-mix(in srgb, var(--color-logo-purple) 55%, transparent) 0%,
				transparent 40%
			),
			radial-gradient(
				circle at 30% 80%,
				color-mix(in srgb, var(--color-logo-blue) 60%, transparent) 0%,
				transparent 45%
			),
			radial-gradient(
				circle at 80% 30%,
				color-mix(in srgb, var(--color-logo-green) 45%, transparent) 0%,
				transparent 40%
			);
		filter: blur(36px);
		mix-blend-mode: screen;
		animation: lk-orb-spin-rev 24s linear infinite;
	}

	/* Orbit rings — concentric thin circles around the orb, slowly
	   counter-rotating. Drawn with conic-gradient + radial mask so
	   they look like fine lines, not solid discs. */
	.lk-auth-orb-ring {
		position: absolute;
		left: 50%;
		top: 50%;
		border-radius: 50%;
		transform: translate(-50%, -50%);
		pointer-events: none;
		border: 1px solid color-mix(in srgb, var(--color-bg-elevated) 8%, transparent);
		background: conic-gradient(
			from 0deg,
			color-mix(in srgb, var(--color-logo-purple) 12%, transparent) 0deg,
			transparent 90deg,
			color-mix(in srgb, var(--color-logo-blue) 10%, transparent) 180deg,
			transparent 270deg,
			color-mix(in srgb, var(--color-logo-purple) 12%, transparent) 360deg
		);
		mask-image: radial-gradient(circle, transparent 49.5%, black 50%, black 50.5%, transparent 51%);
		-webkit-mask-image: radial-gradient(
			circle,
			transparent 49.5%,
			black 50%,
			black 50.5%,
			transparent 51%
		);
	}
	.lk-auth-orb-ring--outer {
		width: 132%;
		height: 132%;
		animation: lk-orb-spin 60s linear infinite reverse;
	}
	.lk-auth-orb-ring--inner {
		width: 112%;
		height: 112%;
		animation: lk-orb-spin 40s linear infinite;
	}

	@keyframes lk-orb-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes lk-orb-spin-rev {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(-360deg);
		}
	}

	/* Note: the orb-stage's own transform (mouse drift) wraps these
	   children, so each child's rotate animation composes correctly
	   inside the translated parent. */
	.lk-auth-orb-ring--outer,
	.lk-auth-orb-ring--inner {
		/* Rings are positioned via translate(-50%, -50%) on the
		   ::before/element transform; rotate animation overrides on
		   keyframe execution. To preserve centring, animate via the
		   `rotate` property (not transform) so the translate stays. */
		animation-name: lk-orb-ring-rotate;
	}
	.lk-auth-orb-ring--outer {
		animation: lk-orb-ring-rotate 60s linear infinite reverse;
	}
	.lk-auth-orb-ring--inner {
		animation: lk-orb-ring-rotate 40s linear infinite;
	}

	@keyframes lk-orb-ring-rotate {
		from {
			rotate: 0deg;
		}
		to {
			rotate: 360deg;
		}
	}

	/* ── Reduced motion: kill rotation + drift. ── */
	@media (prefers-reduced-motion: reduce) {
		.lk-auth-orb,
		.lk-auth-orb-mesh,
		.lk-auth-orb-ring--outer,
		.lk-auth-orb-ring--inner {
			animation: none;
		}
		.lk-orb-drift {
			transform: translate(-50%, -50%);
		}
	}
</style>
