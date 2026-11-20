<script lang="ts">
	import { Command } from '$ui';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Building2, User, Icon } from '$icons';
	import { omniSearchQuery } from '$features/search/queries';
	import { enterScopeMutation } from '$features/operator';
	import { P, session } from '$features/auth';
	import { visibleNav } from '#lib/config/nav.ts';
	import { NAV_ICONS } from '#lib/config/nav-icons.ts';
	import type { SearchPersonHit, SearchTenantHit } from '$features/search/schemas';

	/**
	 * CommandPalette — Cmd/Ctrl+K palette (Linear / Vercel canon) for every
	 * signed-in user. Its "Pages" group is the nav config (`config/nav.ts`)
	 * filtered by what the caller may see — the same list as the sidebar.
	 * Operators who hold platform.users.view OR platform.tenants.view also get
	 * the `/v1/search` tenants / people groups (pg_trgm fanout); for everyone
	 * else that endpoint is never called.
	 *
	 * Keyboard:
	 *   Cmd/Ctrl+K  → toggle open
	 *   Esc         → close (bits-ui default)
	 *
	 * The directory hits come from the server, so the list is not filtered client-side
	 * (`shouldFilter={false}`); the Pages group is filtered here by label.
	 *   Arrow keys  → navigate hits (native focus traversal of <a>s)
	 *   Enter       → activate focused hit (native anchor activation)
	 */

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	let q = $state('');
	const canSearchDirectory = $derived(session.canAny(P.platformTenantsView, P.platformUsersView));
	// '' keeps the omni-search query disabled (it needs 2+ characters).
	const query = omniSearchQuery(() => (canSearchDirectory ? q : ''));

	const pages = $derived(
		visibleNav(session.capabilities, session.inTenantContext)
			.flatMap((s) => s.items)
			.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase()))
	);

	const persons = $derived<SearchPersonHit[]>(query.data?.persons ?? []);
	const tenants = $derived<SearchTenantHit[]>(query.data?.tenants ?? []);
	const hasHits = $derived(persons.length + tenants.length > 0);

	$effect(() => {
		// Reset query when the palette closes
		if (!open) q = '';
	});

	// The one enter flow (same as the tenants-list row click): cookie, cache, layout reload, navigate.
	const enterMutation = enterScopeMutation();
	function enterTenantScope(slug: string) {
		enterMutation.mutate({ slug }, { onSuccess: () => onOpenChange(false) });
	}

	function openPerson(id: string) {
		onOpenChange(false);
		// not-a-guard: opens the person picked from a search hit; capabilities only choose which groups are listed
		goto(resolve('/(app)/operator/persons/[id]', { id }));
	}
</script>

<Command.Dialog
	bind:open
	{onOpenChange}
	shouldFilter={false}
	title="Search"
	description={canSearchDirectory ? 'Search pages, tenants and people' : 'Search pages'}
	class="sm:max-w-[36rem]"
>
	<Command.Input
		bind:value={q}
		placeholder={canSearchDirectory ? 'Search pages, tenants, people…' : 'Search pages…'}
		autocomplete="off"
		aria-label="Search"
	/>
	<Command.List class="max-h-[clamp(200px,60vh,80vh)]">
		{#if pages.length > 0}
			<Command.Group heading="Pages">
				{#each pages as item (item.href)}
					{@const PageIcon = NAV_ICONS[item.key]}
					<Command.LinkItem href={item.href} onSelect={() => onOpenChange(false)}>
						<Icon icon={PageIcon} size="sm" class="text-muted-foreground" />
						<span class="truncate font-medium">{item.label}</span>
					</Command.LinkItem>
				{/each}
			</Command.Group>
		{/if}
		{#if canSearchDirectory}
			{#if q.trim().length < 2}
				<p class="caption text-muted-foreground p-4">Type at least 2 characters.</p>
			{:else if query.isPending}
				<p class="caption text-muted-foreground p-4">Searching…</p>
			{:else if !hasHits}
				<Command.Empty>No matches.</Command.Empty>
			{:else}
				{#if tenants.length > 0}
					<Command.Group heading="Tenants">
						{#each tenants as t (t.id)}
							<Command.Item value={`tenant:${t.id}`} onSelect={() => enterTenantScope(t.slug)}>
								<Icon icon={Building2} size="sm" class="text-muted-foreground" />
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate font-medium">{t.display_name}</span>
									<span class="caption text-muted-foreground truncate"
										>{t.slug} · {t.legal_name}</span
									>
								</span>
							</Command.Item>
						{/each}
					</Command.Group>
				{/if}
				{#if persons.length > 0}
					<Command.Group heading="People">
						{#each persons as p (p.id)}
							<Command.Item value={`person:${p.id}`} onSelect={() => openPerson(p.id)}>
								<Icon icon={User} size="sm" class="text-muted-foreground" />
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate font-medium">{p.first_name} {p.last_name}</span>
									<span class="caption text-muted-foreground truncate">{p.email}</span>
								</span>
							</Command.Item>
						{/each}
					</Command.Group>
				{/if}
			{/if}
		{:else if pages.length === 0}
			<Command.Empty>No matches.</Command.Empty>
		{/if}
	</Command.List>
</Command.Dialog>
