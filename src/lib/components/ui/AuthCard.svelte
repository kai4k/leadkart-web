<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	/**
	 * AuthCard — composes the universal `.glass-card` material with
	 * auth-shell-specific extras: built-in padding + entrance animation
	 * + slow border-glow pulse. The glass material itself (bg + blur +
	 * saturate + brightness + specular + inner gradient + 1.5rem radius)
	 * comes from `.glass-card` in utilities.css — same recipe every
	 * modal / popover / dashboard tile in the product uses.
	 *
	 * API:
	 *   - children   — required; the form content (rendered inside the
	 *                  flow z-index from .glass-card).
	 *   - class      — append-only token classes for caller overrides.
	 *   - layoutClass — content layout (default `stack stack-relaxed`).
	 */

	type Props = {
		class?: string;
		/** Override the default `stack stack-relaxed` content layout. */
		layoutClass?: string;
		children: Snippet;
	};

	let { class: className = '', layoutClass = 'stack stack-relaxed', children }: Props = $props();
</script>

<div class={cn('lk-auth-card glass-card glass-border-glow', className)}>
	<div class={cn(layoutClass)}>
		{@render children()}
	</div>
</div>

<style>
	/* Auth-card-specific extras layered on top of `.glass-card`.
	   Border-glow pulse comes from the `.glass-border-glow` utility
	   (animations.css). Local concern: the entrance animation only. */
	.lk-auth-card {
		padding: clamp(1.5rem, 4vw, 2.5rem);
		animation: lk-auth-card-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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

	@media (prefers-reduced-motion: reduce) {
		.lk-auth-card {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
