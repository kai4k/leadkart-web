<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Slider from './Slider.svelte';

	const { Story } = defineMeta({
		title: 'UI/Slider',
		component: Slider,
		tags: ['autodocs']
	});
</script>

<Story name="Default (0–100)">
	<div style="width: 360px;" class="stack stack-tight">
		<label class="label text-foreground" for="slider-default">Promo discount</label>
		<Slider value={20} aria-label="Promo discount percent" />
		<p class="caption text-muted-foreground">Drag, or use ←/→ arrows. Home/End jump to min/max.</p>
	</div>
</Story>

<Story name="With step (5%)">
	<div style="width: 360px;" class="stack stack-tight">
		<div class="flex justify-between">
			<span class="label text-foreground">MRP override</span>
			<span class="label text-foreground tabular-nums">-10%</span>
		</div>
		<Slider value={10} step={5} min={0} max={50} aria-label="MRP override percent" />
		<p class="caption text-muted-foreground">Operators may override prices ±10% at quote time.</p>
	</div>
</Story>

<Story name="Custom range (300–3000 ms)">
	<div style="width: 360px;" class="stack stack-tight">
		<div class="flex justify-between">
			<span class="label text-foreground">Animation duration</span>
			<span class="label text-foreground tabular-nums">800 ms</span>
		</div>
		<Slider value={800} min={300} max={3000} step={100} aria-label="Animation duration" />
	</div>
</Story>

<Story name="Disabled">
	<div style="width: 360px;" class="stack stack-tight">
		<span class="label text-muted-foreground">Plan upgrade required</span>
		<Slider value={40} disabled aria-label="Quota slider" />
	</div>
</Story>
