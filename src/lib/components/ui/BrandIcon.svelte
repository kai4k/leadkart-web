<script lang="ts">
	/**
	 * The large app icon of the logo pack (svg/icon-glass-light.svg and icon-glass-dark.svg), inline,
	 * for the auth brand panel. Decorative: the heading beside it names the product.
	 *
	 * Light or dark by `<html data-mode>` through the `dark:` variant (CSS only, no JavaScript): both
	 * drawings are in the page and one is hidden. Every gradient and filter id is prefixed with this
	 * instance's id, so two icons on one page never reference each other's definitions. The blue
	 * stops are the chosen primary's steps (500 to 700 on light, 400 to 600 on dark: the logo's own
	 * #3B82F6 / #1D4ED8 and #60A5FA / #2563EB for the default palette) and the capsule stops are
	 * --brand-capsule-from / -to, so the icon follows the palette like the in-app mark.
	 *
	 * The glass plate is the one place an icon draws a translucent surface; with transparency
	 * reduced or off (the preference, the OS settings) the glass layers are hidden and the plate is the
	 * opaque card colour (--brand-plate-glass / --brand-plate-solid, theme/materials.css; not --material-* tokens, so the icon lives with the other brand primitives).
	 */
	import { cn } from '#lib/utils/cn.ts';

	let { class: className }: { class?: string } = $props();
	const uid = $props.id();
</script>

{#snippet body(frame: string, capsule: string)}
	<g transform="translate(-24 -14)" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path d="M150 108V316a32 32 0 0 0 32 32H410" stroke="url(#{frame})" stroke-width="68" />
		<path d="M272 248L384 136" stroke="url(#{capsule})" stroke-width="84" />
		<circle cx="204" cy="432" r="34" fill="url(#{frame})" />
		<circle cx="366" cy="432" r="34" fill="url(#{frame})" />
	</g>
{/snippet}

{#snippet highlights(strong: boolean)}
	<g transform="translate(-24 -14)" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path
			d="M144 114V312a26 26 0 0 0 26 26H404"
			stroke="white"
			stroke-width={strong ? 18 : 16}
			stroke-opacity={strong ? 0.42 : 0.45}
		/>
		<path
			d="M144 114V312a26 26 0 0 0 26 26H404"
			stroke="white"
			stroke-width={strong ? 6 : 5}
			stroke-opacity={strong ? 0.8 : 0.85}
		/>
		<path
			d="M275 245L381 139"
			stroke="white"
			stroke-width={strong ? 22 : 20}
			stroke-opacity={strong ? 0.38 : 0.42}
		/>
		<path
			d="M275 245L381 139"
			stroke="white"
			stroke-width={strong ? 7 : 6}
			stroke-opacity={strong ? 0.85 : 0.9}
		/>
		<circle cx="196" cy="424" r="10" fill="white" fill-opacity={strong ? 0.65 : 0.7} />
		<circle cx="358" cy="424" r="10" fill="white" fill-opacity={strong ? 0.65 : 0.7} />
	</g>
{/snippet}

<span class={cn('relative inline-block', className)} aria-hidden="true" data-brand-icon>
	<!-- light -->
	<svg viewBox="0 0 512 512" class="size-full dark:hidden" focusable="false">
		<defs>
			<linearGradient
				id="{uid}-frame-l"
				gradientUnits="userSpaceOnUse"
				x1="110"
				y1="80"
				x2="430"
				y2="460"
			>
				<stop offset="0" class="frame-light-from" />
				<stop offset="1" class="frame-light-to" />
			</linearGradient>
			<linearGradient
				id="{uid}-capsule-l"
				gradientUnits="userSpaceOnUse"
				x1="260"
				y1="110"
				x2="400"
				y2="270"
			>
				<stop offset="0" class="capsule-from" />
				<stop offset="1" class="capsule-to" />
			</linearGradient>
			<linearGradient id="{uid}-sub-l" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="white" stop-opacity="0.96" />
				<stop offset="0.5" stop-color="white" stop-opacity="0.8" />
				<stop offset="1" stop-color="white" stop-opacity="0.58" />
			</linearGradient>
			<radialGradient id="{uid}-halo-l" cx="48%" cy="48%" r="48%">
				<stop offset="0" class="frame-light-from" stop-opacity="0.28" />
				<stop offset="0.6" class="capsule-from" stop-opacity="0.12" />
				<stop offset="1" class="frame-light-from" stop-opacity="0" />
			</radialGradient>
			<linearGradient id="{uid}-rim-l" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="white" />
				<stop offset="0.35" stop-color="white" stop-opacity="0.85" />
				<stop offset="0.75" stop-color="white" stop-opacity="0.3" />
				<stop offset="1" class="ink" stop-opacity="0.18" />
			</linearGradient>
			<linearGradient id="{uid}-sheen-l" x1="0" y1="0" x2="0.85" y2="0.85">
				<stop offset="0" stop-color="white" stop-opacity="0.7" />
				<stop offset="0.32" stop-color="white" stop-opacity="0.22" />
				<stop offset="0.55" stop-color="white" stop-opacity="0" />
			</linearGradient>
			<filter id="{uid}-plate-shadow-l" x="-20%" y="-20%" width="140%" height="150%">
				<feDropShadow dx="0" dy="20" stdDeviation="18" class="flood-ink" flood-opacity="0.15" />
				<feDropShadow dx="0" dy="6" stdDeviation="8" class="flood-frame" flood-opacity="0.1" />
			</filter>
			<filter id="{uid}-mark-shadow-l" x="-30%" y="-30%" width="160%" height="170%">
				<feDropShadow dx="0" dy="16" stdDeviation="12" class="flood-frame" flood-opacity="0.36" />
				<feDropShadow dx="0" dy="4" stdDeviation="5" class="flood-ink" flood-opacity="0.16" />
			</filter>
		</defs>
		<g filter="url(#{uid}-plate-shadow-l)">
			<rect x="6" y="6" width="500" height="500" rx="114" class="plate-solid" />
			<g class="plate-glass">
				<rect x="6" y="6" width="500" height="500" rx="114" fill="url(#{uid}-sub-l)" />
				<rect x="6" y="6" width="500" height="500" rx="114" fill="url(#{uid}-halo-l)" />
				<path
					d="M6 120C6 57 57 6 120 6H386C449 6 500 57 500 120V190L6 330Z"
					fill="url(#{uid}-sheen-l)"
				/>
				<rect
					x="9"
					y="9"
					width="494"
					height="494"
					rx="111"
					fill="none"
					stroke="url(#{uid}-rim-l)"
					stroke-width="6"
				/>
				<rect
					x="12"
					y="12"
					width="488"
					height="488"
					rx="108"
					fill="none"
					stroke="white"
					stroke-opacity="0.55"
					stroke-width="1.5"
				/>
			</g>
			<rect x="9" y="9" width="494" height="494" rx="111" class="plate-edge" />
		</g>
		<g transform="translate(76.8 76.8) scale(0.70)">
			<g filter="url(#{uid}-mark-shadow-l)">
				{@render body(`${uid}-frame-l`, `${uid}-capsule-l`)}
			</g>
			{@render body(`${uid}-frame-l`, `${uid}-capsule-l`)}
			{@render highlights(true)}
		</g>
	</svg>

	<!-- dark -->
	<svg viewBox="0 0 512 512" class="hidden size-full dark:block" focusable="false">
		<defs>
			<linearGradient
				id="{uid}-frame-d"
				gradientUnits="userSpaceOnUse"
				x1="110"
				y1="80"
				x2="430"
				y2="460"
			>
				<stop offset="0" class="frame-dark-from" />
				<stop offset="1" class="frame-dark-to" />
			</linearGradient>
			<linearGradient
				id="{uid}-capsule-d"
				gradientUnits="userSpaceOnUse"
				x1="260"
				y1="110"
				x2="400"
				y2="270"
			>
				<stop offset="0" class="capsule-from" />
				<stop offset="1" class="capsule-to" />
			</linearGradient>
			<linearGradient id="{uid}-sub-d" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="white" stop-opacity="0.16" />
				<stop offset="0.5" stop-color="white" stop-opacity="0.08" />
				<stop offset="1" stop-color="white" stop-opacity="0.03" />
			</linearGradient>
			<radialGradient id="{uid}-halo-d" cx="50%" cy="50%" r="50%">
				<stop offset="0" class="frame-dark-from" stop-opacity="0.55" />
				<stop offset="0.6" class="frame-dark-to" stop-opacity="0.2" />
				<stop offset="1" class="frame-dark-from" stop-opacity="0" />
			</radialGradient>
			<linearGradient id="{uid}-rim-d" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="white" stop-opacity="0.65" />
				<stop offset="0.5" stop-color="white" stop-opacity="0.12" />
				<stop offset="1" stop-color="white" stop-opacity="0.25" />
			</linearGradient>
			<linearGradient id="{uid}-sheen-d" x1="0" y1="0" x2="0.85" y2="0.85">
				<stop offset="0" stop-color="white" stop-opacity="0.35" />
				<stop offset="0.32" stop-color="white" stop-opacity="0.1" />
				<stop offset="0.55" stop-color="white" stop-opacity="0" />
			</linearGradient>
			<filter id="{uid}-plate-shadow-d" x="-20%" y="-20%" width="140%" height="150%">
				<feDropShadow dx="0" dy="24" stdDeviation="24" class="flood-night" flood-opacity="0.75" />
				<feDropShadow
					dx="0"
					dy="6"
					stdDeviation="10"
					class="flood-frame-dark"
					flood-opacity="0.12"
				/>
			</filter>
			<filter id="{uid}-mark-shadow-d" x="-30%" y="-30%" width="160%" height="170%">
				<feDropShadow dx="0" dy="16" stdDeviation="16" class="flood-night" flood-opacity="0.85" />
				<feDropShadow
					dx="0"
					dy="0"
					stdDeviation="14"
					class="flood-frame-dark"
					flood-opacity="0.4"
				/>
			</filter>
		</defs>
		<g filter="url(#{uid}-plate-shadow-d)">
			<rect x="6" y="6" width="500" height="500" rx="114" class="plate-solid" />
			<g class="plate-glass">
				<rect x="6" y="6" width="500" height="500" rx="114" fill="url(#{uid}-sub-d)" />
				<rect x="6" y="6" width="500" height="500" rx="114" fill="url(#{uid}-halo-d)" />
				<path
					d="M6 120C6 57 57 6 120 6H386C449 6 500 57 500 120V190L6 330Z"
					fill="url(#{uid}-sheen-d)"
				/>
				<rect
					x="9"
					y="9"
					width="494"
					height="494"
					rx="111"
					fill="none"
					stroke="url(#{uid}-rim-d)"
					stroke-width="6"
				/>
				<rect
					x="12"
					y="12"
					width="488"
					height="488"
					rx="108"
					fill="none"
					stroke="white"
					stroke-opacity="0.3"
					stroke-width="1.5"
				/>
			</g>
			<rect x="9" y="9" width="494" height="494" rx="111" class="plate-edge" />
		</g>
		<g transform="translate(76.8 76.8) scale(0.70)">
			<g filter="url(#{uid}-mark-shadow-d)">
				{@render body(`${uid}-frame-d`, `${uid}-capsule-d`)}
			</g>
			{@render body(`${uid}-frame-d`, `${uid}-capsule-d`)}
			{@render highlights(false)}
		</g>
	</svg>
</span>

<style>
	.frame-light-from {
		stop-color: var(--primary-500);
	}
	.frame-light-to {
		stop-color: var(--primary-700);
	}
	.frame-dark-from {
		stop-color: var(--primary-400);
	}
	.frame-dark-to {
		stop-color: var(--primary-600);
	}
	.capsule-from {
		stop-color: var(--brand-capsule-from);
	}
	.capsule-to {
		stop-color: var(--brand-capsule-to);
	}
	.ink {
		stop-color: var(--foreground);
	}
	.flood-ink {
		flood-color: var(--foreground);
	}
	.flood-frame {
		flood-color: var(--primary-700);
	}
	.flood-frame-dark {
		flood-color: var(--primary-400);
	}
	.flood-night {
		flood-color: var(--background);
	}
	/* the plate: glass layers, or (transparency reduced / off) the opaque card colour with a hairline */
	.plate-solid {
		fill: var(--card);
		opacity: var(--brand-plate-solid);
	}
	.plate-glass {
		opacity: var(--brand-plate-glass);
	}
	.plate-edge {
		fill: none;
		stroke: var(--border);
		stroke-width: 3;
		opacity: var(--brand-plate-solid);
	}
</style>
