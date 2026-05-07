<script lang="ts">
	let { children } = $props();
</script>

<div class="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
	<!-- Compact brand banner — visible on mobile only. Full brand panel
	     on desktop sits in the second column. -->
	<header
		class="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-brand-600)] px-6 py-4 text-[var(--color-fg-on-brand)] lg:hidden"
	>
		<span class="h4">LeadKart</span>
		<span class="caption text-[var(--color-brand-50)]">Pharma SaaS</span>
	</header>

	<!-- Brand panel — desktop only. <section>, not <aside>: this IS part
	     of the primary layout, not tangential content. -->
	<section
		aria-label="Brand"
		class="hidden lg:flex lg:flex-col lg:justify-between lg:bg-[var(--color-brand-600)] lg:p-12 lg:text-[var(--color-fg-on-brand)]"
	>
		<div class="h2">LeadKart</div>
		<div class="stack stack-snug">
			<p class="display-2">Pharma SaaS, built for India.</p>
			<p class="lead text-[var(--color-brand-50)]">
				Manage leads, orders, inventory, and dispatch from a single tenant-isolated workspace.
			</p>
		</div>
		<div class="caption text-[var(--color-brand-50)]">© LeadKart 2026</div>
	</section>

	<!-- Form panel — full width on mobile, half on desktop. -->
	<main class="flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
		<div class="w-full max-w-md">
			{@render children()}
		</div>
	</main>
</div>
