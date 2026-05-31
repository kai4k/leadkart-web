<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Search, Building2, User, Icon } from '$icons';
	import { omniSearchQuery } from '$features/search/queries';
	import { enterScope } from '$features/operator/scope';
	import type { SearchPersonHit, SearchTenantHit } from '$features/search/schemas';

	/**
	 * CommandPalette — Cmd/Ctrl+K omni-search palette (Linear / Vercel
	 * canon). Backed by the operator's `/v1/search` endpoint (pg_trgm
	 * fanout). Visible only when the caller has platform.users.view OR
	 * platform.tenants.view — the consumer (AppShell) handles gating.
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
	const query = omniSearchQuery(() => q);

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
			goto(resolve('/operator/scope/profile'));
		} catch {
			// Toast surfaces via global mutation cache — no inline error needed
		}
	}

	function openPerson(id: string) {
		onOpenChange(false);
		goto(resolve(`/operator/persons/${id}`));
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
			<BitsDialog.Title class="sr-only">Search tenants and people</BitsDialog.Title>
			<div class="border-border-subtle border-b">
				<label class="cluster cluster-tight px-4 py-3">
					<Icon icon={Search} size="sm" class="text-fg-muted" />
					<input
						type="search"
						bind:value={q}
						placeholder="Search tenants, people…"
						autocomplete="off"
						aria-label="Search"
						class="text-fg body-base placeholder:text-fg-subtle flex-1 bg-transparent outline-none"
					/>
				</label>
			</div>

			<div class="max-h-[clamp(200px,60vh,80vh)] overflow-y-auto">
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
													<span class="body-sm text-fg truncate font-medium">{t.display_name}</span>
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
		</BitsDialog.Content>
	</BitsDialog.Portal>
</BitsDialog.Root>
