<script lang="ts">
	import { Bell, Menu, Moon, Sun } from 'lucide-svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import UserMenu from './UserMenu.svelte';

	let { onToggleSidebar } = $props<{ onToggleSidebar?: () => void }>();
</script>

<header
	class="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4"
>
	<div class="cluster">
		<button
			class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)] lg:hidden"
			aria-label="Toggle sidebar"
			onclick={() => onToggleSidebar?.()}
		>
			<Menu size={20} />
		</button>
		<span class="h4">LeadKart</span>
	</div>
	<div class="cluster" style="--cluster-gap: var(--spacing-2);">
		<button
			class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]"
			aria-label={theme.effective === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
			onclick={() => theme.toggle()}
		>
			{#if theme.effective === 'dark'}
				<Sun size={20} />
			{:else}
				<Moon size={20} />
			{/if}
		</button>
		<button class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]" aria-label="Notifications">
			<Bell size={20} />
		</button>
		<UserMenu />
	</div>
</header>
