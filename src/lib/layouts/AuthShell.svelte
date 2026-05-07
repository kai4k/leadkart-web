<script lang="ts">
	/**
	 * AuthShell — minimal wrapper for the (auth) route group: signin,
	 * signup, forgot-password, reset-password, verify. No sidebar, no
	 * topbar; centred card with brand mark + the page slot.
	 */
	let { children } = $props();
</script>

<div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
	<!-- Brand panel — hidden on mobile, illustration-style block on desktop. -->
	<aside class="hidden lg:flex lg:flex-col lg:justify-between lg:bg-brand-600 lg:p-12 lg:text-white">
		<div class="text-2xl font-semibold tracking-tight">LeadKart</div>
		<div class="space-y-3">
			<p class="text-3xl font-semibold leading-tight">Pharma SaaS, built for India.</p>
			<p class="max-w-md text-brand-100">
				Manage leads, orders, inventory, and dispatch from a single tenant-isolated workspace.
			</p>
		</div>
		<div class="text-sm text-brand-100">© LeadKart 2026</div>
	</aside>

	<!-- Form panel — full width on mobile, half on desktop. -->
	<main class="flex flex-col items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
		<div class="w-full max-w-md">
			{@render children()}
		</div>
	</main>
</div>
