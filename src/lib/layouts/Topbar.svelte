<script lang="ts">
	import { Bell, Menu, Search, Settings, Icon } from '$icons';
	import { Logo } from '$ui';
	import UserMenu from './UserMenu.svelte';

	let { onToggleSidebar, onOpenSettings } = $props<{
		onToggleSidebar?: () => void;
		onOpenSettings?: () => void;
	}>();
</script>

<!--
  Domiex-style fixed Topbar. Spans the viewport top-edge; logo + sidebar
  toggle live in the sidebar-width column on the left so the Topbar's
  brand area aligns with the Sidebar below it. Search + actions on the
  right. Bottom border separates from the page content below.
-->
<header class="lk-topbar" aria-label="Application bar">
	<!-- Left: brand cluster aligned to sidebar width -->
	<div class="lk-topbar-brand">
		<button
			class="lk-topbar-iconbtn lg:hidden"
			aria-label="Toggle sidebar"
			onclick={() => onToggleSidebar?.()}
		>
			<Icon icon={Menu} size="md" />
		</button>
		<a href="/dashboard" class="flex items-center gap-2" aria-label="LeadKart home">
			<Logo size="lg" />
		</a>
	</div>

	<!-- Centre: search (hidden on mobile) -->
	<div class="lk-topbar-search hidden lg:flex">
		<Icon icon={Search} size="sm" />
		<input type="search" class="lk-topbar-search-input" placeholder="Search…" aria-label="Search" />
	</div>

	<!-- Right: action cluster -->
	<div class="lk-topbar-actions">
		<button
			class="lk-topbar-iconbtn"
			aria-label="Open theme + layout settings"
			onclick={() => onOpenSettings?.()}
		>
			<Icon icon={Settings} size="md" />
		</button>
		<button class="lk-topbar-iconbtn lk-topbar-iconbtn--with-dot" aria-label="Notifications">
			<Icon icon={Bell} size="md" />
			<span class="lk-topbar-dot" aria-hidden="true"></span>
		</button>
		<UserMenu />
	</div>
</header>

<style>
	.lk-topbar {
		position: fixed;
		inset: 0 0 auto 0;
		z-index: var(--z-sticky);
		display: grid;
		grid-template-columns: var(--lk-sidebar-width) 1fr auto;
		align-items: center;
		block-size: var(--lk-topbar-height);
		padding-inline-end: clamp(1rem, 2vw, 1.5rem);
		background: var(--color-bg-elevated);
		border-block-end: 1px solid var(--color-border);
		transition: grid-template-columns 0.2s ease-out;
	}
	@media (max-width: 63.99rem) {
		.lk-topbar {
			grid-template-columns: auto 1fr auto;
			padding-inline-start: clamp(0.75rem, 2vw, 1.25rem);
		}
	}
	/* Horizontal mode — no sidebar, so the brand cluster collapses
	   to its natural width. */
	:global(:root[data-layout='horizontal']) .lk-topbar {
		grid-template-columns: auto 1fr auto;
		padding-inline-start: clamp(0.75rem, 2vw, 1.25rem);
	}

	.lk-topbar-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-inline: clamp(0.75rem, 1.5vw, 1.25rem);
		block-size: 100%;
		border-inline-end: 1px solid var(--color-border);
	}
	@media (max-width: 63.99rem) {
		.lk-topbar-brand {
			border-inline-end: none;
		}
	}
	:global(:root[data-layout='horizontal']) .lk-topbar-brand {
		border-inline-end: none;
	}

	.lk-topbar-search {
		position: relative;
		align-items: center;
		gap: 0.5rem;
		padding-inline-start: clamp(1rem, 2.5vw, 1.75rem);
		color: var(--color-fg-muted);
	}
	.lk-topbar-search-input {
		inline-size: 18rem;
		max-inline-size: 100%;
		padding-block: 0.5rem;
		padding-inline: 0.5rem;
		border: 0;
		background: transparent;
		font-size: var(--text-sm);
		color: var(--color-fg);
	}
	.lk-topbar-search-input:focus {
		outline: 0;
	}
	.lk-topbar-search-input::placeholder {
		color: var(--color-fg-subtle);
	}

	.lk-topbar-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding-inline-start: 0.5rem;
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
