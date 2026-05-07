<script lang="ts">
	import Topbar from './Topbar.svelte';
	import Sidebar from './Sidebar.svelte';
	import Footer from './Footer.svelte';

	let { children } = $props();
	let sidebarOpen = $state(false);
</script>

<div class="flex h-screen flex-col">
	<Topbar onToggleSidebar={() => (sidebarOpen = !sidebarOpen)} />
	<div class="flex min-h-0 flex-1">
		<!-- Desktop sidebar — always visible. -->
		<aside class="hidden lg:block">
			<Sidebar />
		</aside>

		<!-- Mobile sidebar — drawer. -->
		{#if sidebarOpen}
			<button
				class="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
				aria-label="Close sidebar"
				onclick={() => (sidebarOpen = false)}
			></button>
			<aside class="fixed inset-y-0 left-0 z-50 lg:hidden">
				<Sidebar />
			</aside>
		{/if}

		<main class="min-w-0 flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
			<div class="mx-auto max-w-7xl p-6">
				{@render children()}
			</div>
		</main>
	</div>
	<Footer />
</div>
