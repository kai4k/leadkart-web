<script lang="ts">
	/**
	 * Topbar (Domiex): sidebar toggle, the brand where the sidebar does not carry it, the search
	 * trigger, then the mode switch, the theme-settings button and the user menu. No heading and no
	 * breadcrumb (the page's PageHeader owns both) and no notifications (nothing feeds them).
	 * Placement is `styles/theme/layouts.css` (`[data-shell='topbar']`); this file is the look, in
	 * semantic tokens only. In the `pattern` nav type layouts.css re-declares the tokens it reads.
	 */
	import { _ } from 'svelte-i18n';
	import { resolve } from '$app/paths';
	import { Command, Moon, Search, Settings, Sun, Icon } from '$icons';
	import { BrandMark, Button, Sidebar } from '$ui';
	import { getPreferences } from '$features/preferences';
	import UserMenu from './UserMenu.svelte';
	import { quickModeTarget } from './mode-toggle.ts';
	import { CommandPalette } from '$features/search';
	import { session } from '$features/auth';

	let { onOpenCustomizer }: { onOpenCustomizer?: () => void } = $props();

	const prefs = getPreferences();

	// The palette is for every signed-in user (pages from the nav config); operators
	// additionally get tenant / people search inside it.
	const canSearch = $derived(session.isAuthenticated);

	let paletteOpen = $state(false);

	function onKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			if (!canSearch) return;
			e.preventDefault();
			paletteOpen = !paletteOpen;
		}
	}

	// light <-> dark; in `auto` / `black-white` the choice is not overwritten: open the customizer.
	function toggleMode() {
		const next = quickModeTarget(prefs.mode);
		if (next) prefs.set({ mode: next });
		else onOpenCustomizer?.();
	}

	const iconButton = 'size-9 pointer-coarse:size-11';
</script>

<svelte:window onkeydown={onKeydown} />

<header
	data-shell="topbar"
	class="bg-card text-foreground border-border flex items-center justify-between gap-3 border-b px-5"
>
	<div class="flex min-w-0 items-center gap-2">
		<!-- The brand: here for vertical, boxed and horizontal; modern and semibox show it in the sidebar. -->
		<a
			href={resolve('dashboard')}
			aria-label={$_('shell.brandHome')}
			class="focus-visible:ring-ring flex shrink-0 items-center rounded-md outline-none focus-visible:ring-2 [:root[data-layout=modern]_&]:lg:hidden [:root[data-layout=semibox]_&]:lg:hidden"
		>
			<BrandMark wordmark decorative class="max-sm:[&>span:last-child]:hidden" />
		</a>
		<Sidebar.Trigger class="{iconButton} [:root[data-layout=horizontal]_&]:lg:hidden" />
		{#if canSearch}
			<button
				type="button"
				class="border-border bg-muted text-muted-foreground focus-visible:ring-ring ms-2 hidden h-9 w-72 items-center gap-2 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 md:inline-flex"
				aria-label={$_('shell.searchLabel')}
				title={$_('shell.searchTitle')}
				onclick={() => (paletteOpen = true)}
			>
				<Icon icon={Search} size="sm" />
				<span class="flex-1 text-start">{$_('shell.searchPlaceholder')}</span>
				<kbd
					class="border-border text-muted-foreground inline-flex items-center gap-0.5 rounded-sm border px-1.5 font-mono text-xs"
				>
					<Icon icon={Command} size="xs" />K
				</kbd>
			</button>
		{/if}
	</div>

	<div class="flex items-center gap-2">
		<Button
			variant="ghost"
			size="icon"
			class={iconButton}
			aria-label={$_('shell.toggleMode')}
			onclick={toggleMode}
		>
			<!-- CSS picks the icon (the mode is an <html> attribute): right at first paint, no JS -->
			<Icon icon={Moon} size="md" class="dark:hidden" />
			<Icon icon={Sun} size="md" class="hidden dark:block" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class={iconButton}
			aria-label={$_('shell.openCustomizer')}
			onclick={() => onOpenCustomizer?.()}
		>
			<Icon icon={Settings} size="md" />
		</Button>
		<UserMenu />
	</div>
</header>

<CommandPalette bind:open={paletteOpen} onOpenChange={(o) => (paletteOpen = o)} />
