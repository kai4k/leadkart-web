<script lang="ts">
	/**
	 * The auth pages' decoration: soft primary-coloured washes and a field of pharma shapes (capsules,
	 * tablets, crosses) that drift and step aside from the pointer. Purely decorative: `aria-hidden`,
	 * `pointer-events: none`. Colours come only from the `--primary-*` ramp and `--foreground`, so the
	 * field follows the user's primary and mode. Under `prefers-reduced-motion` every animation is
	 * removed and the pointer script is not even attached: the field is static.
	 *
	 * The seeded generator makes the server render and the client's hydration byte-identical.
	 */
	import { onMount } from 'svelte';
	import { FAR, MID, NEAR, type Particle } from './auth-particles.ts';

	let root: HTMLElement | undefined = $state();

	// Particles within a radius of the pointer are pushed outward (CSS vars read by their transform);
	// the transition brings them back. The listener is on the frame (this element's parent): the
	// backdrop itself never takes pointer events.
	onMount(() => {
		if (!root) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const parent = root.parentElement;
		if (!parent) return;
		const frame: HTMLElement = parent;

		const particles = root.querySelectorAll<HTMLElement>('.lk-particle');
		let raf = 0;
		let mx = -1000;
		let my = -1000;
		const THRESHOLD = 14; // percent of the viewport
		const MAX_PUSH = 3; // vw, at distance 0

		function commit() {
			raf = 0;
			const tSq = THRESHOLD * THRESHOLD;
			for (const el of particles) {
				const dx = parseFloat(el.style.getPropertyValue('--x')) - mx;
				const dy = parseFloat(el.style.getPropertyValue('--y')) - my;
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
		function onMove(e: MouseEvent) {
			const rect = frame.getBoundingClientRect();
			mx = ((e.clientX - rect.left) / rect.width) * 100;
			my = ((e.clientY - rect.top) / rect.height) * 100;
			if (!raf) raf = requestAnimationFrame(commit);
		}
		function onLeave() {
			mx = -1000;
			my = -1000;
			if (!raf) raf = requestAnimationFrame(commit);
		}

		frame.addEventListener('mousemove', onMove, { passive: true });
		frame.addEventListener('mouseleave', onLeave);
		return () => {
			frame.removeEventListener('mousemove', onMove);
			frame.removeEventListener('mouseleave', onLeave);
			if (raf) cancelAnimationFrame(raf);
		};
	});
</script>

{#snippet layer(list: Particle[], depth: string)}
	<div class="lk-particles lk-particles--{depth}">
		{#each list as p (`${p.x}-${p.y}`)}
			<span
				class="lk-particle lk-particle--{p.kind}"
				style="--x:{p.x}%;--y:{p.y}%;--len:{p.length}px;--rot:{p.rotation}deg;--delay:{p.delay}s;--c1:var({p.c1});--c2:var({p.c2});"
			></span>
		{/each}
	</div>
{/snippet}

<div bind:this={root} class="lk-backdrop" data-auth-backdrop aria-hidden="true">
	<div class="lk-blobs">
		<span class="lk-blob lk-blob--a"></span>
		<span class="lk-blob lk-blob--b"></span>
		<span class="lk-blob lk-blob--c"></span>
	</div>
	{@render layer(FAR, 'far')}
	{@render layer(MID, 'mid')}
	{@render layer(NEAR, 'near')}
</div>

<style>
	.lk-backdrop,
	.lk-blobs,
	.lk-particles {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.lk-backdrop {
		z-index: 0;
		overflow: hidden;
	}
	.lk-particles--far {
		z-index: 1;
	}
	.lk-particles--mid {
		z-index: 2;
	}
	.lk-particles--near {
		z-index: 3;
	}

	/* soft washes in the primary ramp; opacity (not an alpha colour) keeps every token opaque */
	.lk-blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.35;
		will-change: transform;
	}
	.lk-blob--a {
		inline-size: 28rem;
		block-size: 28rem;
		inset-block-start: -10%;
		inset-inline-start: -8%;
		background: var(--primary-400);
		animation: lk-drift-a 30s ease-in-out infinite;
	}
	.lk-blob--b {
		inline-size: 32rem;
		block-size: 32rem;
		inset-block-start: 20%;
		inset-inline-end: -14%;
		background: var(--primary-600);
		opacity: 0.25;
		animation: lk-drift-b 36s ease-in-out infinite;
	}
	.lk-blob--c {
		inline-size: 26rem;
		block-size: 26rem;
		inset-block-end: -10%;
		inset-inline-start: 18%;
		background: var(--primary-300);
		animation: lk-drift-c 32s ease-in-out infinite;
	}
	@keyframes lk-drift-a {
		50% {
			translate: 5rem 4rem;
		}
	}
	@keyframes lk-drift-b {
		50% {
			translate: -5rem 6rem;
		}
	}
	@keyframes lk-drift-c {
		50% {
			translate: 5rem -4rem;
		}
	}

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
		opacity: 0.7;
		animation: lk-particle-drift 5s ease-in-out infinite;
		animation-delay: var(--delay);
	}
	.lk-particles--far .lk-particle {
		--scale: 0.85;
		opacity: 0.45;
		block-size: 2.5px;
	}
	.lk-particles--near .lk-particle {
		opacity: 0.9;
		block-size: 4.5px;
	}

	/* capsule: two tones with a seam; opacity of the whole shape keeps the colours opaque tokens */
	.lk-particle--pill,
	.lk-particle--tracer {
		background: linear-gradient(
			90deg,
			var(--c1) 0%,
			var(--c1) 49%,
			var(--background) 49.5%,
			var(--background) 50.5%,
			var(--c2) 51%,
			var(--c2) 100%
		);
	}
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

	/* medical plus */
	.lk-particle--cross {
		inline-size: 9px;
		block-size: 9px;
		border-radius: 0;
		background: var(--c1);
		mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M4 0h2v4h4v2H6v4H4V6H0V4h4z'/%3E%3C/svg%3E");
		mask-size: contain;
		mask-repeat: no-repeat;
	}
	.lk-particles--far .lk-particle--cross {
		inline-size: 7px;
		block-size: 7px;
	}
	.lk-particles--near .lk-particle--cross {
		inline-size: 11px;
		block-size: 11px;
	}

	/* tablet: a disc */
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

	@keyframes lk-particle-drift {
		50% {
			translate: 0 -6px;
		}
	}

	/* reduced motion: a static field */
	@media (prefers-reduced-motion: reduce) {
		.lk-particle,
		.lk-blob {
			animation: none;
		}
		.lk-particle {
			transition: none;
		}
	}
</style>
