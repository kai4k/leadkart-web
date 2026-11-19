<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Search, Building2, User, Icon } from '$icons';
	import { omniSearchQuery } from '$features/search/queries';
	import { enterScope } from '$features/operator';
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

	async function enterTenantScope(slug: string) {
		// Reuse the BFF scope endpoint — same flow as the tenants-list row click.
		try {
			await enterScope({ slug });
			onOpenChange(false);
			goto(resolve('operator/scope/profile'));
		} catch {
			// Toast surfaces via global mutation cache — no inline error needed
		}
	}

	function openPerson(id: string) {
		onOpenChange(false);
		goto(resolve('/(app)/operator/persons/[id]', { id }));
	}
</script>

<BitsDialog.Root bind:open {onOpenChange}>
	<BitsDialog.Portal>
		<BitsDialog.Overlay
			class="is-fixed-overlay--overlay animate-fade-in bg-overlay inset-0 backdrop-blur-sm"
		/>
		<BitsDialog.Content
			class="is-fixed-overlay--modal bg-bg-elevated border border-border rounded-xl shadow-card animate-pop-in z-modal fixed start-1/2 top-[12vh] flex w-full max-w-xl -translate-x-1/2 flex-col rounded-xl border border-[var(--glass-border-subtle)]"
		>
			<BitsDialog.Title class="sr-only"
				>Search pages{canSearchDirectory ? ', tenants and people' : ''}</BitsDialog.Title
			>
			<div class="border-border-subtle border-b">
				<label class="cluster cluster-tight px-4 py-3">
					<Icon icon={Search} size="sm" class="text-fg-muted" />
					<input
						type="search"
						bind:value={q}
						placeholder={canSearchDirectory ? 'Search pages, tenants, people…' : 'Search pages…'}
						autocomplete="off"
						aria-label="Search"
						class="text-fg body-base placeholder:text-fg-subtle flex-1 bg-transparent outline-none"
					/>
				</label>
			</div>

			<div class="max-h-[clamp(200px,60vh,80vh)] overflow-y-auto">
				{#if pages.length > 0}
					<div class="stack stack-tight p-2">
						<p class="text-fg-subtle px-2 pt-1 overline">Pages</p>
						<ul class="stack stack-tight m-0 list-none p-0">
							{#each pages as item (item.href)}
								{@const PageIcon = NAV_ICONS[item.key]}
								<li>
									<a
										href={item.href}
										onclick={() => onOpenChange(false)}
										class="hover:bg-bg-muted focus-visible:bg-bg-muted block w-full rounded-md px-3 py-2 text-start focus-visible:outline-none"
									>
										<span class="cluster cluster-tight">
											<Icon icon={PageIcon} size="sm" class="text-fg-muted" />
											<span class="body-sm text-fg truncate font-medium">{item.label}</span>
										</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if canSearchDirectory}
					<div class={pages.length > 0 ? 'border-border-subtle border-t' : undefined}>
						{#if q.trim().length < 2}
							<p class="caption text-fg-subtle p-4">Type at least 2 characters.</p>
						{:else if query.isPending}
							<p class="caption text-fg-subtle p-4">Searching…</p>
						{:else if !hasHits}
							<p class="caption text-fg-subtle p-4">No matches.</p>
						{:else}
							{#if tenants.length > 0}
								<div class="stack stack-tight p-2">
									<p class="text-fg-subtle px-2 pt-1 overline">Tenants</p>
									<ul class="stack stack-tight m-0 list-none p-0">
										{#each tenants as t (t.id)}
											<li>
												<button
													type="button"
													onclick={() => enterTenantScope(t.slug)}
													class="hover:bg-bg-muted focus-visible:bg-bg-muted w-full rounded-md px-3 py-2 text-start focus-visible:outline-none"
												>
													<div class="cluster cluster-tight">
														<Icon icon={Building2} size="sm" class="text-fg-muted" />
														<div class="stack stack-tight min-w-0 flex-1">
															<span class="body-sm text-fg truncate font-medium"
																>{t.display_name}</span
															>
															<span class="caption text-fg-muted truncate"
																>{t.slug} · {t.legal_name}</span
															>
														</div>
													</div>
												</button>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
							{#if persons.length > 0}
								<div class="stack stack-tight border-border-subtle border-t p-2">
									<p class="text-fg-subtle px-2 pt-1 overline">People</p>
									<ul class="stack stack-tight m-0 list-none p-0">
										{#each persons as p (p.id)}
											<li>
												<button
													type="button"
													onclick={() => openPerson(p.id)}
													class="hover:bg-bg-muted focus-visible:bg-bg-muted w-full rounded-md px-3 py-2 text-start focus-visible:outline-none"
												>
													<div class="cluster cluster-tight">
														<Icon icon={User} size="sm" class="text-fg-muted" />
														<div class="stack stack-tight min-w-0 flex-1">
															<span class="body-sm text-fg truncate font-medium"
																>{p.first_name} {p.last_name}</span
															>
															<span class="caption text-fg-muted truncate">{p.email}</span>
														</div>
													</div>
												</button>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						{/if}
					</div>
				{:else if pages.length === 0}
					<p class="caption text-fg-subtle p-4">No matches.</p>
				{/if}
			</div>
		</BitsDialog.Content>
	</BitsDialog.Portal>
</BitsDialog.Root>
