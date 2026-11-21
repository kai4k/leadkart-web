<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * AuthCard: the sign-in card, a sheet over the decorative backdrop, on the pane material (`material-pane`:
	 * glass over the backdrop, opaque under Solid), with padding and an entrance animation of its own.
	 *
	 * API:
	 *   - children    required; the form content
	 *   - class       append-only token classes for caller overrides
	 *   - layoutClass content layout (default `stack stack-relaxed`)
	 */

	type Props = {
		class?: string;
		/** Override the default `stack stack-relaxed` content layout. */
		layoutClass?: string;
		children: Snippet;
	};

	let { class: className = '', layoutClass = 'stack stack-relaxed', children }: Props = $props();
</script>

<div class={cn('lk-auth-card material-pane rounded-xl', className)}>
	<div class={cn(layoutClass)}>
		{@render children()}
	</div>
</div>

<style>
	/* The entrance animation and the padding are this card's own; the surface is the material. */
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
