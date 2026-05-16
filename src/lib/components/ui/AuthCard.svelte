<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	/**
	 * AuthCard — frosted-glass surface for any auth-shell form. Today
	 * that's only /signin (self-service auth flows are disabled per
	 * the LeadKart auth model). Ports the Blazor `lk-login-card`
	 * chrome per
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
	<div class={cn('lk-auth-card-content', layoutClass)}>
		{@render children()}
	</div>
</div>

<style>
	/* Liquid-Glass thick material — matches .glass-card recipe so the
	   login modal reads as the SAME surface as the dashboard tiles /
	   topbar / sidebar / footer. The previous solid-white + heavy
	   shadow has been replaced with translucent thick-glass fill +
	   backdrop-filter + inset specular + inner gradient via ::before. */
	.lk-auth-card {
		position: relative;
		overflow: hidden;
		border-radius: 1.5rem;
		padding: clamp(1.5rem, 4vw, 2.5rem);
		background: var(--color-bg-elevated);
		border: var(--glass-border-subtle);
		box-shadow: var(--glass-specular);
		animation:
			lk-auth-card-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards,
			lk-auth-card-border-glow 4s ease-in-out 1s infinite;
	}
	@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
		.lk-auth-card {
			background: var(--glass-bg-thick);
			-webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))
				brightness(var(--glass-brightness));
			backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))
				brightness(var(--glass-brightness));
		}
	}
	/* Inner gradient — same dimensional curvature every glass surface
	   uses (top-light → bottom-darker). Replaces the legacy .lk-auth-
	   card-flare's bespoke linear gradient with the system token. */
	.lk-auth-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: var(--glass-inner-gradient);
		pointer-events: none;
		z-index: 0;
	}

	/* No dark-mode override needed — the AuthShell scope theme-locks
	   all surface + foreground tokens to light, so the AuthCard
	   renders identically in both OS themes. */

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
		.lk-auth-card::before {
			display: none;
		}
	}
</style>
