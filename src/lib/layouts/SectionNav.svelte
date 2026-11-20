<script lang="ts">
	/**
	 * SectionNav: the tab row of a section (account settings, tenant settings, the tenant-context
	 * pages). Plain links in a named `<nav>`; the current page is `aria-current="page"` (the one
	 * matcher `isNavActive`, so a child path keeps its tab). Colours are tokens: the current tab is
	 * the card surface with the foreground, the others `muted-foreground` on the page (both gated).
	 */
	import { page } from '$app/state';
	import { Icon } from '$icons';
	import { isNavActive } from '#lib/config/nav.ts';
	import { cn } from '#lib/utils/cn.ts';

	type Tab = {
		href: string;
		label: string;
		/** a lucide icon component */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
	};
	let { tabs, label }: { tabs: Tab[]; label: string } = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- hrefs come from the nav config or the section layout, already resolved -->
<nav aria-label={label}>
	<ul class="m-0 flex list-none flex-wrap items-center gap-1 p-0">
		{#each tabs as tab (tab.href)}
			{@const active = isNavActive(page.url.pathname, tab.href)}
			<li>
				<a
					href={tab.href}
					aria-current={active ? 'page' : undefined}
					class={cn(
						'focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2',
						active
							? 'bg-card text-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'
					)}
				>
					{#if tab.icon}<Icon icon={tab.icon} size="xs" />{/if}
					{tab.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
