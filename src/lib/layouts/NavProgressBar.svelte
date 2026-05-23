<script lang="ts">
	import { navigating } from '$app/state';

	/**
	 * Top-of-viewport navigation progress bar — Stripe / Linear / GitHub canon.
	 *
	 * `navigating` is non-null while SvelteKit is processing a client-side
	 * navigation (server load, page module load, etc.). On long server loads
	 * (operator scope tenant fetch, capabilities bootstrap) the bar gives the
	 * user immediate feedback that something is happening.
	 *
	 * 200ms delay before the bar appears so quick navigations (cached, no
	 * server load) don't flash. The opacity transition smooths the entrance.
	 *
	 * Two-phase progression: a fast 0→70% sweep over the first ~300ms, then
	 * idle until the navigation completes. Stripe's NProgress is the canonical
	 * implementation; this is a Svelte 5 native take.
	 */
	let visible = $state(false);
	let progress = $state(0);
	let showTimer: ReturnType<typeof setTimeout> | undefined;
	let progressTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (navigating.to) {
			// Delay the bar by 200ms — most nav completes inside that window.
			clearTimeout(showTimer);
			showTimer = setTimeout(() => {
				visible = true;
				progress = 0;
				// Ramp to 70% quickly, then ease — feels responsive without
				// promising completion before the network finishes.
				progressTimer = setTimeout(() => (progress = 70), 16);
			}, 200);
		} else {
			clearTimeout(showTimer);
			clearTimeout(progressTimer);
			// On navigation end: jump to 100, then fade.
			if (visible) {
				progress = 100;
				setTimeout(() => {
					visible = false;
					progress = 0;
				}, 250);
			}
		}
	});
</script>

<div
	class="lk-nav-progress"
	class:lk-nav-progress--visible={visible}
	role="progressbar"
	aria-label="Loading next page"
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={progress}
>
	<div class="lk-nav-progress-bar" style="transform: scaleX({progress / 100});"></div>
</div>

<style>
	.lk-nav-progress {
		position: fixed;
		inset-block-start: 0;
		inset-inline: 0;
		block-size: 2px;
		z-index: var(--z-toast, 1000);
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.2s ease-out;
	}
	.lk-nav-progress--visible {
		opacity: 1;
	}
	.lk-nav-progress-bar {
		block-size: 100%;
		inline-size: 100%;
		background: var(--color-primary);
		transform-origin: left;
		transform: scaleX(0);
		transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
		box-shadow: 0 0 8px var(--color-primary);
	}
	@media (prefers-reduced-motion: reduce) {
		.lk-nav-progress {
			transition: none;
		}
		.lk-nav-progress-bar {
			transition: none;
		}
	}
</style>
