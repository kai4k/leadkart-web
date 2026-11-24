<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * AuthCard: the sign-in card, a sheet over the decorative backdrop, on the pane material (`material-pane`:
	 * glass over the backdrop, opaque under Solid), with padding and an entrance animation of its own.
	 *
	 * API:
	 *   - title       the page's one `<h1>`; with `subtitle` it is the header every auth screen shares
	 *   - children    required; the form content
	 *   - footer      the one link row under the content ("Back to sign in"): same place on every auth screen
	 *   - class       append-only token classes for caller overrides
	 *   - layoutClass content layout (default `stack stack-relaxed`)
	 */

	type Props = {
		class?: string;
		/** Override the default `stack stack-relaxed` content layout. */
		layoutClass?: string;
		title: string;
		subtitle?: string;
		footer?: Snippet;
		children: Snippet;
	};

	let {
		class: className = '',
		layoutClass = 'stack stack-relaxed',
		title,
		subtitle,
		footer,
		children
	}: Props = $props();
</script>

<div class={cn('lk-auth-card material-pane rounded-xl', className)}>
	<div class={cn(layoutClass)}>
		<header class="stack stack-tight text-center">
			<h1 class="h2 text-foreground">{title}</h1>
			{#if subtitle}<p class="body-sm text-muted-foreground">{subtitle}</p>{/if}
		</header>
		{@render children()}
		{#if footer}
			<p class="caption text-muted-foreground text-center empty:hidden">{@render footer()}</p>
		{/if}
	</div>
</div>

<style>
	/* The entrance animation and the padding are this card's own; the surface is the material.
	 * No fill mode: the last keyframe is the card's resting style, so once the entrance ends the animation lets go
	 * of the card. With `forwards` a finished entrance kept holding transform and opacity: when the entrance was cut
	 * short (the visual tests end every animation at once), Chrome could leave the card on an animated compositor
	 * layer, which rounds the card's fractional position to other pixels than the settled card (a 1px shift). */
	.lk-auth-card {
		padding: clamp(1.5rem, 4vw, 2.5rem);
		animation: lk-auth-card-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1);
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
