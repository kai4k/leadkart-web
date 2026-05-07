<script lang="ts">
	import { Bell, Menu, Moon, Sun, Icon } from '$icons';
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
			<Icon icon={Menu} size="md" />
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
				<Icon icon={Sun} size="md" />
			{:else}
				<Icon icon={Moon} size="md" />
			{/if}
		</button>
		<button class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]" aria-label="Notifications">
			<Icon icon={Bell} size="md" />
		</button>
		<UserMenu />
	</div>
</header>
