<script lang="ts">
	import { Bell, Menu, Moon, Sun } from 'lucide-svelte';
	import { effectiveTheme, toggleTheme } from '$lib/stores/theme.svelte';

	let { onToggleSidebar } = $props<{ onToggleSidebar?: () => void }>();
</script>

<header
	class="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900"
>
	<div class="flex items-center gap-3">
		<button
			class="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
			aria-label="Toggle sidebar"
			onclick={() => onToggleSidebar?.()}
		>
			<Menu size={20} />
		</button>
		<span class="text-lg font-semibold tracking-tight">LeadKart</span>
	</div>
	<div class="flex items-center gap-2">
		<button
			class="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
			aria-label="Toggle theme"
			onclick={() => toggleTheme()}
		>
			{#if effectiveTheme() === 'dark'}
				<Sun size={20} />
			{:else}
				<Moon size={20} />
			{/if}
		</button>
		<button
			class="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
			aria-label="Notifications"
		>
			<Bell size={20} />
		</button>
	</div>
</header>
