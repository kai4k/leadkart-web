<script lang="ts">
	import { Bell, Menu, Settings, Icon } from '$icons';
	import { Logo } from '$ui';
	import UserMenu from './UserMenu.svelte';

	let { onToggleSidebar, onOpenSettings } = $props<{
		onToggleSidebar?: () => void;
		onOpenSettings?: () => void;
	}>();
</script>

<header
	class="glass-appbar sticky top-0 z-(--z-sticky) flex h-14 items-center justify-between px-4"
>
	<div class="cluster">
		<button
			class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)] lg:hidden"
			aria-label="Toggle sidebar"
			onclick={() => onToggleSidebar?.()}
		>
			<Icon icon={Menu} size="md" />
		</button>
		<a href="/dashboard" class="flex items-center" aria-label="LeadKart home">
			<Logo size="lg" />
		</a>
	</div>
	<div class="cluster" style="--cluster-gap: var(--spacing-2);">
		<button
			class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]"
			aria-label="Open theme + layout settings"
			onclick={() => onOpenSettings?.()}
		>
			<Icon icon={Settings} size="md" />
		</button>
		<button class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]" aria-label="Notifications">
			<Icon icon={Bell} size="md" />
		</button>
		<UserMenu />
	</div>
</header>
