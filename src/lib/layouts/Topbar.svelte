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
	.lk-topbar {
		position: fixed;
		inset-block-start: 0;
		inset-inline: 0;
		z-index: var(--z-sticky);
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		block-size: var(--lk-topbar-height);
		padding-inline: clamp(0.75rem, 1.5vw, 1.25rem);
		background: var(--color-bg-elevated);
		border-block-end: 1px solid var(--color-border);
	}

	.lk-topbar-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-inline-size: 0;
	}
	.lk-topbar-title {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--color-fg);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Cmd-K trigger — looks like an input but is a button. Hidden on
	   mobile (< sm) to keep the title visible. */
	.lk-topbar-search-trigger {
		display: none;
		align-items: center;
		gap: 0.5rem;
		inline-size: clamp(16rem, 28vw, 22rem);
		padding-inline: 0.75rem;
		padding-block: 0.4375rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-fg-muted);
		font-size: var(--text-sm);
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.lk-topbar-search-trigger:hover {
		border-color: var(--color-fg-subtle);
		background: var(--color-bg-elevated);
	}
	.lk-topbar-search-trigger:focus-visible {
		outline: 2px solid var(--color-brand-500);
		outline-offset: 2px;
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
	@media (min-width: 40rem) {
		.lk-topbar-search-trigger {
			display: inline-flex;
		}
	}

	.lk-topbar-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		justify-content: flex-end;
	}

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
	.lk-topbar-iconbtn:hover {
		background: var(--color-bg-muted);
		color: var(--color-fg);
	}
	.lk-topbar-iconbtn:focus-visible {
		outline: 2px solid var(--color-brand-500);
		outline-offset: 2px;
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
</style>
