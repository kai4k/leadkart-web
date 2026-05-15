<script lang="ts">
	import { page } from '$app/state';
	import { Bell, ChevronRight, Command, PanelLeft, Search, Settings, Icon } from '$icons';
	import { routeContext } from '$lib/utils/routeTitle';
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

	const route = $derived(routeContext(page.url.pathname));
</script>

<header class="lk-topbar glass-appbar" aria-label="Application bar">
	<!-- Left: toggle + route badge (icon + title in a glass pill).
	     Matches the Liquid-Glass language of the surface and gives
	     the current location a visual anchor (Apple Music / Notion
	     pattern: icon + name as a single readable unit). -->
	<div class="lk-topbar-left">
		<button
			type="button"
			class="lk-topbar-iconbtn"
			aria-label="Toggle sidebar"
			onclick={() => onToggleSidebar?.()}
		>
			<Icon icon={PanelLeft} size="md" />
		</button>
		<nav class="lk-topbar-crumbs" aria-label="Breadcrumb">
			<ol class="lk-topbar-crumb-list">
				{#each route.crumbs as crumb, i (crumb.href)}
					{@const isLast = i === route.crumbs.length - 1}
					<li class="lk-topbar-crumb">
						{#if isLast}
							<h1 class="lk-topbar-title" aria-current="page">{crumb.label}</h1>
						{:else}
							<a class="lk-topbar-crumb-link" href={crumb.href}>{crumb.label}</a>
							<Icon icon={ChevronRight} size="xs" class="lk-topbar-crumb-sep" />
						{/if}
					</li>
				{/each}
			</ol>
		</nav>
	</div>

	<!-- Centre: cmd-K trigger (deferred palette) -->
	<button
		type="button"
		class="lk-topbar-search-trigger glass-pill"
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
	/* ─── Topbar layout ────────────────────────────────────────────
	   Layout only — the GLASS treatment (translucent bg + blur +
	   specular) is provided by the `.glass-appbar` utility class
	   (utilities.css). In semibox mode we ADD `.glass-bordered` via
	   the :global rule below — same utility composition, no per-
	   component recipe duplication. */
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
		contain: layout style;
		transition:
			inset-block-start 0.18s ease-out,
			inset-inline-start 0.18s ease-out,
			inset-inline-end 0.18s ease-out,
			border-radius 0.18s ease-out;
	}

	/* Semibox — borrow .glass-bordered's full ring + radius + drop-
	   shadow without re-declaring it here. */
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
	/* ─── Breadcrumb trail ────────────────────────────────────────
	   Multi-segment crumb path; intermediate crumbs are subtle
	   clickable text muted by `--color-fg-muted`, separated by a
	   chevron glyph. The trailing (current) crumb gets the icon
	   badge + the page <h1> in semibold so screen readers + visual
	   readers find the title at the end. Apple Music / Notion /
	   Vercel pattern: location reads as one progressive unit. */
	.lk-topbar-crumbs {
		display: flex;
		align-items: center;
		min-inline-size: 0;
		padding-inline-start: 0.25rem;
	}
	.lk-topbar-crumb-list {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-inline-size: 0;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.lk-topbar-crumb {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-inline-size: 0;
	}
	.lk-topbar-crumb-link {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-inline-size: 8rem;
		transition: color 0.15s;
	}
	/* Focus ring handled by global :focus-visible in base.css */
	@media (hover: hover) and (pointer: fine) {
		.lk-topbar-crumb-link:hover {
			color: var(--color-fg);
		}
	}
	.lk-topbar-crumb :global(.lk-topbar-crumb-sep) {
		color: var(--color-fg-subtle);
		flex-shrink: 0;
	}
	/* On phones, hide all intermediate crumbs — keep only the last one
	   so the topbar doesn't crowd. Linear / Notion canon. */
	@media (max-width: 47.99rem) {
		.lk-topbar-crumb:not(:last-child) {
			display: none;
		}
	}
	.lk-topbar-title {
		font-size: var(--text-base);
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-fg);
		margin: 0;
		min-inline-size: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	@media (min-width: 48rem) {
		.lk-topbar-title {
			font-size: var(--text-lg);
		}
	}

	/* ─── Cmd-K trigger ───────────────────────────────────────────
	   Hidden by default (mobile + small tablets); reveals at 48rem
	   (768px) so phones + small tablets get the full title width
	   without ugly truncation. */
	/* Layout only — visual is .glass-pill (added via class binding) */
	.lk-topbar-search-trigger {
		display: none;
		align-items: center;
		gap: 0.5rem;
		inline-size: clamp(16rem, 28vw, 22rem);
		padding-inline: 0.75rem;
		padding-block: 0.4375rem;
		border: var(--glass-border-subtle);
		color: var(--color-fg-muted);
		font-size: var(--text-sm);
		transition:
			border-color 0.15s,
			background 0.15s,
			box-shadow 0.15s;
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
	.lk-topbar-iconbtn:active {
		background: var(--glass-pill-bg);
		box-shadow: var(--glass-specular);
		color: var(--color-primary-active);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-topbar-iconbtn:hover {
			background: var(--glass-pill-bg);
			box-shadow: var(--glass-specular);
			color: var(--color-primary-hover);
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
