<script lang="ts">
	import { page } from '$app/state';
	import { NAV } from '$lib/config/nav';

	let { onNavigate } = $props<{ onNavigate?: () => void }>();

	/**
	 * Active-state matcher — top-level routes use exact match; nested
	 * use startsWith with a trailing-slash boundary so /leads doesn't
	 * also light up for /leads-archive. Industry-standard pattern (Vercel
	 * dashboard, Linear sidebar).
	 */
	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (path === href) return true;
		return path.startsWith(href + '/');
	}

	// TODO(v0.3): filter by session.principal.permissions[] against
	// item.requires once the JWT permission claim is consumed.
	const sections = NAV;
</script>

<nav
	class="flex h-full w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
	aria-label="Main navigation"
>
	<div class="stack stack-relaxed flex-1 overflow-y-auto p-3">
		{#each sections as section, i (section.title ?? i)}
			{#if section.items.length > 0}
				<div class="stack stack-tight">
					{#if section.title}
						<p class="px-3 pb-1 overline">{section.title}</p>
					{/if}
					<ul class="stack stack-tight">
						{#each section.items as item (item.href)}
							{@const Icon = item.icon}
							{@const active = isActive(item.href)}
							<li>
								<a
									href={item.href}
									aria-current={active ? 'page' : undefined}
									onclick={() => onNavigate?.()}
									class={[
										'body-sm flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors',
										active
											? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-700)] dark:text-[var(--color-brand-100)]'
											: 'text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]'
									]}
								>
									<Icon size={18} aria-hidden="true" />
									<span>{item.label}</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/each}
	</div>
</nav>
