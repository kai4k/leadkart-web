<script lang="ts">
	/**
	 * The brand side of the auth frame (lg and up): the product line and three feature pills on opaque
	 * `card` surfaces, over the backdrop. It sits in an `<aside aria-label>` (the frame provides it);
	 * the copy is plain paragraphs, not headings, so the page form owns the `<h1>`.
	 */
	import { _ } from 'svelte-i18n';
	import { BrandIcon, BrandWordmark } from '#lib/components/ui/index.ts';
	import { Icon, ShieldCheck, TrendingUp, Truck } from '#lib/icons/index.ts';

	const year = new Date().getFullYear();
	const FEATURES = [
		{ icon: ShieldCheck, key: 'security' },
		{ icon: TrendingUp, key: 'tracking' },
		{ icon: Truck, key: 'dispatch' }
	] as const;
</script>

<div class="flex min-h-full flex-col justify-center gap-6">
	<div class="flex items-center gap-4">
		<BrandIcon class="size-20 shrink-0" />
		<BrandWordmark decorative class="text-foreground h-8" />
	</div>

	<div class="bg-card border-border rounded-2xl border px-7 py-6 shadow-sm">
		<p class="text-primary-text text-4xl leading-tight font-bold tracking-tight">
			{$_('auth.brand.headline')}
		</p>
	</div>

	<div class="bg-card border-border rounded-xl border px-5 py-4 shadow-sm">
		<p class="text-muted-foreground text-base">{$_('auth.brand.tagline')}</p>
	</div>

	<ul class="m-0 flex list-none flex-col gap-3.5 p-0">
		{#each FEATURES as feature (feature.key)}
			<li
				class="bg-card border-border flex items-center gap-3.5 rounded-full border py-2.5 ps-4 pe-3 shadow-sm"
			>
				<span
					class="bg-primary-soft text-primary-text inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
				>
					<Icon icon={feature.icon} size="md" />
				</span>
				<span class="text-foreground text-base">{$_(`auth.brand.features.${feature.key}`)}</span>
			</li>
		{/each}
	</ul>

	<p class="text-muted-foreground mt-4 text-xs">
		{$_('shell.footer.copyright', { values: { year } })}
	</p>
</div>
