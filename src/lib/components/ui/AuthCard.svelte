<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	/**
	 * AuthCard — frosted-glass surface for any auth-shell form
	 * (signin / register / forgot / reset / confirm-email-change).
	 * Ports the Blazor `lk-login-card` chrome per
	 * LeadKart.Web.Client/Components/Pages/Auth/Login.razor.css.
	 *
	 * Surface details:
	 *   - 78%-opacity frosted background w/ `backdrop-filter: blur(40px)
	 *     saturate(1.4)` so the AuthShell's radial wash texture reads
	 *     through correctly. Falls back to solid bg under
	 *     `prefers-reduced-transparency`.
	 *   - Top "specular flare" — a half-height linear-gradient overlay
	 *     mimicking light hitting glass. aria-hidden, decorative only.
	 *   - 0.7s entrance animation (translateY + scale) + slow 4s border-
	 *     glow pulse (border tint cycles toward brand-500). Both gated
	 *     on `prefers-reduced-motion`.
	 *
	 * API:
	 *   - children — required; the form content. Rendered inside a
	 *     `position: relative; z-index: 1` container so it sits above
	 *     the flare without callers having to z-index-juggle.
	 *   - class — append-only Tailwind / token classes for caller-side
	 *     spacing or alignment overrides.
	 *
	 * Default content layout is `stack stack-relaxed` (vertical flow,
	 * 1.5rem gap). Override via the `layoutClass` prop when a denser
	 * stack is needed — e.g. the register form's 7-field column.
	 */

	type Props = {
		class?: string;
		/** Override the default `stack stack-relaxed` content layout. */
		layoutClass?: string;
		children: Snippet;
	};

	let { class: className = '', layoutClass = 'stack stack-relaxed', children }: Props = $props();
</script>

<div class={cn('lk-auth-card', className)}>
	<div class="lk-auth-card-flare" aria-hidden="true"></div>
	<div class={cn('lk-auth-card-content', layoutClass)}>
		{@render children()}
	</div>
</div>

<style>
	.lk-auth-card {
		position: relative;
		overflow: hidden;
		border-radius: 1.5rem;
		padding: clamp(1.5rem, 4vw, 2.5rem);
		/* Solid bg-elevated — the prior 78% transparent treatment was
		   designed for the dark brand-panel side; on the light form-
		   side it produced a card that blended into the page. Going
		   opaque lets the border + shadow do the visual containment. */
		background: var(--color-bg-elevated);
		/* border-strong (darker than border) gives the card a clear
		   edge against the off-white form-side bg. Brand-tinted shadow
		   stack adds depth; inset highlight keeps the glass feel at
		   the top edge. */
		border: 1px solid var(--color-border-strong);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.8),
			0 1px 3px color-mix(in srgb, var(--color-brand-900) 4%, transparent),
			0 12px 32px color-mix(in srgb, var(--color-brand-900) 10%, transparent),
			0 24px 64px color-mix(in srgb, var(--color-brand-900) 6%, transparent);
		animation:
			lk-auth-card-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards,
			lk-auth-card-border-glow 4s ease-in-out 1s infinite;
	}

	.lk-auth-card-flare {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(
			180deg,
			rgb(255 255 255 / 0.5) 0%,
			rgb(255 255 255 / 0.15) 30%,
			transparent 100%
		);
		border-radius: 1.5rem 1.5rem 0 0;
		pointer-events: none;
		z-index: 0;
		mask-image: linear-gradient(180deg, black 0%, transparent 70%);
		-webkit-mask-image: linear-gradient(180deg, black 0%, transparent 70%);
	}

	.lk-auth-card-content {
		position: relative;
		z-index: 1;
	}

	@keyframes lk-auth-card-enter {
		0% {
			opacity: 0;
			transform: translateY(1.875rem) scale(0.97);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes lk-auth-card-border-glow {
		0%,
		100% {
			border-color: var(--color-border);
		}
		50% {
			border-color: color-mix(in srgb, var(--color-brand-400) 45%, var(--color-border));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lk-auth-card {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-transparency) {
		.lk-auth-card {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			background: var(--color-bg-elevated);
		}
		.lk-auth-card-flare {
			display: none;
		}
	}
</style>
