<script lang="ts">
	/**
	 * PageHeader (Domiex page heading): the page's ONLY `<h1>`, with the breadcrumb trail on the end
	 * side, an optional description, `meta` beside the title (status badges) and `actions` (buttons).
	 * Every page renders one, inside `PageContainer`; the topbar has no heading and no trail.
	 *
	 * The default trail is the route: each path segment that is a nav entry is a link (labelled in the
	 * user's language from `nav.items.*`), other segments are plain text, and the last item is the
	 * title. Pass `crumbs` for a dynamic trail ("Tenants / Acme"), `[]` to hide it.
	 */
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { ChevronRight, Icon } from '$icons';
	import { routeContext } from '#lib/utils/routeTitle.ts';
	import { inNestedPageHeaders } from './nested-page-header.ts';

	/** `isolate`: the label is a name somebody else typed (a tenant, a person): wrap it in <bdi> */
	type Crumb = { label: string; href?: string; isolate?: boolean };
	type Props = {
		title: string;
		/** the title is a name somebody else typed (a tenant, a person): it is isolated in <bdi>, so a bidi control
		 *  character in it cannot reorder the text around it (breadcrumb, badges) */
		isolated?: boolean;
		description?: string;
		crumbs?: Crumb[];
		actions?: Snippet;
		meta?: Snippet;
		/** a back link above the title (Task 25's BackLink goes here) */
		leading?: Snippet;
		/** `data-testid` of the `<h1>` (a page whose e2e finds its title by it) */
		titleTestId?: string;
	};
	let {
		title,
		isolated = false,
		description,
		crumbs,
		actions,
		meta,
		leading,
		titleTestId
	}: Props = $props();

	// Below a layout that already shows the page header: a section title (h2), no second trail.
	const nested = inNestedPageHeaders();

	const trail = $derived.by<Crumb[]>(() => {
		const full = fullTrail();
		// A trail needs somewhere to go: one crumb only repeats the h1 (or names the page above it).
		return full.length < 2 ? [] : full;
	});

	function fullTrail(): Crumb[] {
		if (nested) return [];
		if (crumbs) return crumbs;
		const route = routeContext(page.url.pathname).crumbs;
		return route.map((c, i) =>
			i === route.length - 1
				? { label: title, isolate: isolated }
				: c.key
					? { label: $_(`nav.items.${c.key}`), href: c.href }
					: { label: c.label }
		);
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- hrefs are nav-config paths or resolved by the caller -->
<div class="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2" data-page-heading>
	<div class="min-w-0">
		{#if leading}<div class="mb-1">{@render leading()}</div>{/if}
		<div class="flex flex-wrap items-center gap-2">
			<svelte:element
				this={nested ? 'h2' : 'h1'}
				class="text-foreground min-w-0 text-lg font-semibold break-words"
				data-testid={titleTestId}
			>
				{#if isolated}<bdi>{title}</bdi>{:else}{title}{/if}
			</svelte:element>
			{@render meta?.()}
		</div>
		{#if description}
			<p class="text-muted-foreground mt-1 text-sm">{description}</p>
		{/if}
	</div>
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		{#if trail.length > 0}
			<nav aria-label={$_('common.breadcrumb')}>
				<ol class="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-sm">
					{#each trail as crumb, i (`${i}-${crumb.label}`)}
						{@const last = i === trail.length - 1}
						<li
							class="flex items-center gap-1.5"
							aria-current={last ? 'page' : undefined}
							class:text-foreground={last}
							class:text-muted-foreground={!last}
						>
							{#if crumb.href && !last}
								<a
									href={crumb.href}
									class="hover:text-foreground focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
									>{crumb.label}</a
								>
							{:else if crumb.isolate}
								<bdi>{crumb.label}</bdi>
							{:else}
								{crumb.label}
							{/if}
							{#if !last}
								<Icon icon={ChevronRight} size="xs" class="rtl:rotate-180" />
							{/if}
						</li>
					{/each}
				</ol>
			</nav>
		{/if}
		{@render actions?.()}
	</div>
</div>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
