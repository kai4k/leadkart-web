<script lang="ts">
	/**
	 * Foundations of the Pebble World design system: palette x mode, colour roles, app colours, type, space,
	 * radius, materials and motion. Every swatch is a token NAME rendered through `var()`, never a value, and
	 * the palette and mode controls drive the real preferences store, so this page shows what the app shows.
	 */
	import { getPreferences, PREFERENCE_VALUES } from '#lib/features/preferences/index.ts';
	import { Icon, Plus } from '#lib/icons/index.ts';

	const prefs = getPreferences();

	const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
	/** [label, token stem]: the palette-following ramps, then the fixed status and neutral ramps */
	const SCALES = [
		['primary', 'primary'],
		['brand-2', 'brand-2'],
		['success', 'palette-success'],
		['warning', 'palette-warning'],
		['danger', 'palette-danger'],
		['info', 'palette-info'],
		['gray', 'palette-gray']
	] as const;
	const ROLES = [
		'background',
		'card',
		'wall-1',
		'wall-2',
		'wall-3',
		'tray',
		'trough',
		'primary',
		'primary-tonal',
		'field-border',
		'meter-track',
		'focus-ring',
		'badge-count'
	];
	const APPS = [
		'home',
		'leads',
		'orders',
		'stock',
		'dispatch',
		'payments',
		'reports',
		'team',
		'settings',
		'companies',
		'people'
	];
	const TYPE = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
	const SPACING = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32];
	const RADII = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'control', 'card', 'sheet', 'pebble', 'full'];
	/** the solid materials (spec 4.3): the class that makes each, and the radius it is drawn with */
	const SOLID = [
		['sheet', 'material-sheet rounded-sheet'],
		['clay', 'material-clay rounded-card'],
		['clay-sm', 'material-clay-sm rounded-control'],
		['tray', 'material-tray rounded-card'],
		['trough', 'material-trough rounded-control']
	] as const;
	const DURATIONS = ['instant', 'fast', 'base', 'slow', 'slower', 'slowest', 'app'];
	const EASES = ['linear', 'in', 'out', 'in-out', 'spring', 'spring-soft'];
	/** [label, duration, ease]: each duration on the default ease, each ease on the slow duration */
	const MOTION = [
		...DURATIONS.map((d) => [`duration-${d}`, d, 'out'] as const),
		...EASES.map((e) => [`ease-${e}`, 'slow', e] as const)
	];
	const swatchClass = 'border-border h-10 rounded-md border';
	const labelClass = 'text-muted-foreground text-center font-mono text-xs';
</script>

<section aria-labelledby="foundations-heading" class="stack stack-loose">
	<h2 id="foundations-heading" class="h2">Foundations</h2>
	<p class="body-sm text-muted-foreground">
		Palette and mode below drive the real preferences store: pick one and the whole app re-skins.
		Every chip is a token name; hover for the CSS variable.
	</p>
	<div class="flex flex-wrap gap-2" role="group" aria-label="Palette and mode">
		{#each PREFERENCE_VALUES.palette as id (id)}
			<button
				type="button"
				onclick={() => prefs.set({ palette: id })}
				class="interactive label border-border rounded-md border px-3 py-2"
				class:ring-2={prefs.palette === id}
				aria-pressed={prefs.palette === id}
			>
				{id}
			</button>
		{/each}
		{#each PREFERENCE_VALUES.mode as id (id)}
			<button
				type="button"
				onclick={() => prefs.set({ mode: id })}
				class="interactive label border-border rounded-md border px-3 py-2"
				class:ring-2={prefs.mode === id}
				aria-pressed={prefs.mode === id}
			>
				{id}
			</button>
		{/each}
	</div>

	<h3 class="h4">Colour roles</h3>
	<div class="grid grid-cols-4 gap-2 lg:grid-cols-7">
		{#each ROLES as name (name)}
			<div class="stack stack-tight gap-1">
				<div
					class={swatchClass}
					style="background: var(--{name});"
					role="img"
					aria-label={name}
					title="--{name}"
				></div>
				<span class={labelClass}>{name}</span>
			</div>
		{/each}
	</div>

	<h3 class="h4">App colours</h3>
	<div class="flex flex-wrap gap-4">
		{#each APPS as key (key)}
			<div class="stack stack-tight items-center gap-1">
				<div
					class="app-{key} material-pebble grid size-14 place-items-center"
					role="img"
					aria-label="{key} pebble"
				>
					<Icon icon={Plus} size="md" />
				</div>
				<span class={labelClass}>{key}</span>
			</div>
		{/each}
	</div>

	<h3 class="h4">Colour scales</h3>
	<p class="body-sm text-muted-foreground">
		OKLCH 11-stop scales. The labels sit outside the chips so axe-core checks contrast against the
		known page background.
	</p>
	{#each SCALES as [scale, stem] (scale)}
		<div class="stack stack-tight">
			<h4 class="label capitalize">{scale}</h4>
			<div class="grid grid-cols-6 gap-1 lg:grid-cols-11">
				{#each SHADES as shade (shade)}
					<div class="stack stack-tight gap-1">
						<div
							class={swatchClass}
							style="background: var(--{stem}-{shade});"
							role="img"
							aria-label="{scale} {shade}"
							title="--{stem}-{shade}"
						></div>
						<span class={labelClass}>{shade}</span>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	<h3 class="h4">Type scale</h3>
	<div class="stack stack-tight">
		{#each TYPE as step (step)}
			<p style="font-size: var(--text-{step});" class="text-foreground">
				<span class="font-mono">text-{step}</span> The quick brown fox
			</p>
		{/each}
	</div>

	<h3 class="h4">Space</h3>
	<div class="stack stack-tight">
		{#each SPACING as n (n)}
			<div class="flex items-center gap-3">
				<span class="{labelClass} w-24 text-start">spacing-{n}</span>
				<div
					class="bg-primary-indicator h-3 rounded-sm"
					style="inline-size: var(--spacing-{n});"
				></div>
			</div>
		{/each}
	</div>

	<h3 class="h4">Radius</h3>
	<div class="flex flex-wrap gap-4">
		{#each RADII as name (name)}
			<div class="stack stack-tight items-center gap-1">
				<div
					class="bg-primary-tonal border-border size-16 border"
					style="border-radius: var(--radius-{name});"
					role="img"
					aria-label="radius {name}"
				></div>
				<span class={labelClass}>{name}</span>
			</div>
		{/each}
	</div>

	<h3 class="h4">Materials</h3>
	<div class="bg-background flex flex-wrap items-center gap-4 rounded-lg p-6">
		{#each SOLID as [name, classes] (name)}
			<div
				data-material={name}
				class="text-foreground body-sm grid min-h-16 min-w-32 place-items-center p-4 {classes}"
			>
				{name}
			</div>
		{/each}
		<div
			data-material="glass"
			class="material-bar text-foreground body-sm grid min-h-16 min-w-32 place-items-center rounded-card p-4"
		>
			glass
		</div>
		<div
			data-material="milk"
			class="material-milk text-foreground body-sm grid min-h-16 min-w-32 place-items-center rounded-card p-4"
		>
			milk
		</div>
		<div
			data-material="pebble"
			class="app-leads material-pebble grid size-14 place-items-center"
			aria-label="pebble"
			role="img"
		>
			<Icon icon={Plus} size="md" />
		</div>
		<div
			data-material="pebble-home"
			class="app-home material-pebble grid size-14 place-items-center"
			aria-label="home pebble"
			role="img"
		>
			<Icon icon={Plus} size="md" />
		</div>
	</div>
	<div
		class="relative h-48 overflow-hidden rounded-lg"
		style="background: linear-gradient(135deg, var(--primary-500), var(--success));"
	>
		<!-- rtl-allow: centered demo, physical centring is the point. -->
		<div
			class="material-glass rounded-card absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-6"
		>
			<p class="h4">Glass over colour</p>
			<p class="body-sm text-muted-foreground mt-2">Top bar, dock and the auth card only.</p>
		</div>
	</div>

	<h3 class="h4">Motion</h3>
	<p class="body-sm text-muted-foreground">
		Hover or focus a row: its bar slides with that duration and easing. Under reduced motion the
		bars stay still.
	</p>
	<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
		{#each MOTION as [label, duration, ease] (label)}
			<button
				type="button"
				class="group focus-visible:ring-ring flex items-center gap-3 rounded-md focus-visible:ring-2"
			>
				<span class="{labelClass} w-32 text-start">{label}</span>
				<span class="bg-primary-tonal block h-3 flex-1 overflow-hidden rounded-full">
					<span
						class="bg-primary-indicator motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0 block h-full w-1/4 rounded-full group-hover:translate-x-[300%] group-focus-visible:translate-x-[300%]"
						style="transition: transform var(--duration-{duration}) var(--ease-{ease});"
					></span>
				</span>
			</button>
		{/each}
	</div>
</section>
