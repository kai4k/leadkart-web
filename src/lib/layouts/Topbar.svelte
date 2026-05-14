<script lang="ts">
	import { page } from '$app/state';
	import { Bell, Command, PanelLeft, Search, Settings, Icon } from '$icons';
	import { routeTitle } from '$lib/utils/routeTitle';
	import UserMenu from './UserMenu.svelte';

	/**
	 * Topbar — Linear/Vercel-minimal shape:
	 *   left   : sidebar toggle + breadcrumb / page title
	 *   centre : cmd-K search trigger button (palette deferred)
	 *   right  : notifications + settings drawer + user menu
	 *
	 * No persistent brand logo — the logo lives in the Sidebar so the
	 * topbar stays clean. Single fixed-height bar across the viewport,
	 * border-bottom for separation.
	 */

	let { onToggleSidebar, onOpenSettings } = $props<{
		onToggleSidebar?: () => void;
		onOpenSettings?: () => void;
	}>();

	const title = $derived(routeTitle(page.url.pathname));
</script>

<header class="lk-topbar" aria-label="Application bar">
	<!-- Left: toggle + breadcrumb -->
	<div class="lk-topbar-left">
		<button
			type="button"
			class="lk-topbar-iconbtn"
			aria-label="Toggle sidebar"
			onclick={() => onToggleSidebar?.()}
		>
			<Icon icon={PanelLeft} size="md" />
		</button>
		<h1 class="lk-topbar-title">{title}</h1>
	</div>

	<!-- Centre: cmd-K trigger (deferred palette) -->
	<button
		type="button"
		class="lk-topbar-search-trigger"
		aria-label="Search (Cmd+K)"
		title="Search · Cmd+K"
	>
		<Icon icon={Search} size="sm" />
		<span class="lk-topbar-search-placeholder">Search…</span>
		<kbd class="lk-topbar-kbd">
			<Icon icon={Command} size="xs" />K
		</kbd>
	</button>

	<!-- Right: actions -->
	<div class="lk-topbar-actions">
		<button class="lk-topbar-iconbtn" aria-label="Notifications">
			<Icon icon={Bell} size="md" />
			<span class="lk-topbar-dot" aria-hidden="true"></span>
		</button>
		<button
			type="button"
			class="lk-topbar-iconbtn"
			aria-label="Open theme settings"
			onclick={() => onOpenSettings?.()}
		>
			<Icon icon={Settings} size="md" />
		</button>
		<UserMenu />
	</div>
</header>

<style>
	/* ─── Topbar surface — Liquid Glass ───────────────────────────
	   Apple WWDC25 material: backdrop-filter blur + saturate over a
	   semi-transparent fill, with a top-edge specular inset shadow
	   to catch the light. Falls back to a solid surface in the
	   @supports check + via the global `prefers-reduced-transparency`
	   rule in base.css. */
	.lk-topbar {
		position: fixed;
		inset-block-start: max(var(--lk-shell-gap), var(--safe-top));
		inset-inline-start: max(var(--lk-topbar-inline-start), var(--safe-left));
		inset-inline-end: max(var(--lk-shell-gap), var(--safe-right));
		z-index: var(--z-sticky);
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: center;
		block-size: var(--lk-topbar-height);
		padding-inline: clamp(0.75rem, 1.5vw, 1.25rem);
		background: var(--color-bg-elevated);
		border-block-end: var(--glass-border-subtle);
		box-shadow: var(--glass-specular);
		contain: layout style;
		transition:
			inset-block-start 0.18s ease-out,
			inset-inline-start 0.18s ease-out,
			inset-inline-end 0.18s ease-out,
			border-radius 0.18s ease-out;
	}
	@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
		.lk-topbar {
			background: var(--glass-bg);
			-webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
			backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
		}
	}

	/* Semibox — topbar floats; glass border + radius + drop-shadow
	   complete the Liquid-Glass treatment (specular highlight stays
	   on top). */
	:global(:root[data-layout='semibox']) .lk-topbar {
		border: var(--glass-border);
		border-radius: var(--lk-shell-radius);
		box-shadow: var(--glass-shadow), var(--glass-specular);
	}

	/* ─── Left cluster (toggle + breadcrumb) ─────────────────────── */
	.lk-topbar-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-inline-size: 0; /* allow text-overflow inside grid 1fr */
	}
	.lk-topbar-title {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--color-fg);
		margin: 0;
		min-inline-size: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ─── Cmd-K trigger ───────────────────────────────────────────
	   Hidden by default (mobile + small tablets); reveals at 48rem
	   (768px) so phones + small tablets get the full title width
	   without ugly truncation. */
	.lk-topbar-search-trigger {
		display: none;
		align-items: center;
		gap: 0.5rem;
		inline-size: clamp(16rem, 28vw, 22rem);
		padding-inline: 0.75rem;
		padding-block: 0.4375rem;
		border-radius: 0.625rem;
		border: var(--glass-border-subtle);
		background: var(--glass-pill-bg);
		box-shadow: var(--glass-specular);
		color: var(--color-fg-muted);
		font-size: var(--text-sm);
		transition:
			border-color 0.15s,
			background 0.15s,
			box-shadow 0.15s;
	}
	.lk-topbar-search-trigger:focus-visible {
		outline: 2px solid var(--color-brand-500);
		outline-offset: 2px;
	}
	.lk-topbar-search-trigger:active {
		background: var(--color-bg-muted);
	}
	.lk-topbar-search-placeholder {
		flex: 1;
		text-align: start;
	}
	.lk-topbar-kbd {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		background: var(--color-bg-muted);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 500;
	}
	@media (min-width: 48rem) {
		.lk-topbar-search-trigger {
			display: inline-flex;
		}
	}
	/* Hover only on hover-capable + fine pointers — prevents the
	   sticky-hover anti-pattern on touch screens (Vercel / Linear
	   canon since 2022). */
	@media (hover: hover) and (pointer: fine) {
		.lk-topbar-search-trigger:hover {
			border-color: var(--color-fg-subtle);
			background: var(--color-bg-elevated);
		}
	}

	/* ─── Right cluster (actions) ───────────────────────────────── */
	.lk-topbar-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		justify-content: flex-end;
		min-inline-size: 0;
	}

	/* ─── Icon button — 36px desktop / 44px touch ────────────────
	   Desktop default keeps the bar compact; coarse-pointer media
	   query bumps to WCAG AAA 2.5.5 minimum target (44px). */
	.lk-topbar-iconbtn {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		border-radius: 0.5rem;
		color: var(--color-fg-muted);
		transition:
			background 0.15s,
			color 0.15s;
	}
	.lk-topbar-iconbtn:focus-visible {
		outline: 2px solid var(--color-brand-500);
		outline-offset: 2px;
	}
	.lk-topbar-iconbtn:active {
		background: var(--glass-pill-bg);
		box-shadow: var(--glass-specular);
		color: var(--color-brand-700);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-topbar-iconbtn:hover {
			background: var(--glass-pill-bg);
			box-shadow: var(--glass-specular);
			color: var(--color-brand-600);
		}
	}
	@media (pointer: coarse) {
		.lk-topbar-iconbtn {
			inline-size: var(--lk-touch-target-min);
			block-size: var(--lk-touch-target-min);
		}
	}

	.lk-topbar-dot {
		position: absolute;
		top: 0.5rem;
		inset-inline-end: 0.5rem;
		inline-size: 0.5rem;
		block-size: 0.5rem;
		background: var(--color-success-500, var(--color-secondary-500));
		border-radius: 9999px;
		border: 2px solid var(--color-bg-elevated);
	}
	@media (pointer: coarse) {
		.lk-topbar-dot {
			top: 0.625rem;
			inset-inline-end: 0.625rem;
		}
	}
</style>
