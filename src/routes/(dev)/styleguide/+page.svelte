<script lang="ts">
	/**
	 * Design-system styleguide — renders every Button variant × size × state
	 * combination + Card variants + colour swatches + glass surfaces.
	 *
	 * Gated to a `(dev)` route group — visible at /styleguide but never linked
	 * from the user-facing nav. Used by:
	 *   - Designers reviewing visual hierarchy + token application
	 *   - Engineers verifying new variants render correctly
	 *   - axe-core a11y CI gate (proves every variant passes WCAG 2.2 AA in
	 *     isolation, not just the routes that happen to use them today)
	 *
	 * Industry canon: every mature SaaS ships either a Storybook or a
	 * dedicated styleguide route. shadcn examples site, Material 3 catalogue,
	 * Polaris (Shopify), Carbon (IBM), Primer (GitHub). Without a styleguide,
	 * variant a11y silently rots whenever a new variant ships under-tested.
	 */
	import { Button, Card, Alert } from '#lib/components/ui/index.ts';
	import { getPreferences, PREFERENCE_VALUES } from '#lib/features/preferences/index.ts';
	import { Icon, Plus } from '#lib/icons/index.ts';
	import Fields from './Fields.svelte';
	import Overlays from './Overlays.svelte';

	const prefs = getPreferences();

	const buttonVariants = [
		'default',
		'secondary',
		'tonal',
		'ghost',
		'destructive',
		'outline',
		'link'
	] as const;
	const buttonSizes = ['sm', 'default', 'lg'] as const;
	const brandShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
	const semanticPalettes = ['brand', 'secondary', 'success', 'warning', 'danger', 'info', 'gray'];
	/** the solid materials (spec 4.3): the class that makes each, and the radius it is drawn with */
	const solidMaterials = [
		['sheet', 'material-sheet rounded-sheet'],
		['clay', 'material-clay rounded-card'],
		['clay-sm', 'material-clay-sm rounded-control'],
		['tray', 'material-tray rounded-card'],
		['trough', 'material-trough rounded-control']
	] as const;
</script>

<svelte:head>
	<title>Design system · LeadKart</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="container-page stack stack-loose py-8">
	<header class="stack stack-tight">
		<h1 class="display-1">LeadKart design system</h1>
		<p class="body-lg text-muted-foreground">
			Every Button variant × size × state, every Card variant, the full token catalogue. This page
			is the a11y CI ground truth — if a variant fails axe-core here, it will fail in production
			wherever it's used.
		</p>
	</header>

	<!-- ═══ BUTTONS ═══════════════════════════════════════════════════════ -->
	<section aria-labelledby="buttons-heading" class="stack stack-loose">
		<h2 id="buttons-heading" class="h2">Buttons</h2>

		{#each buttonVariants as variant (variant)}
			<Card.Root padding="lg" elevation="sm">
				<Card.Header>
					<Card.Title>variant="{variant}"</Card.Title>
					<Card.Description>
						Sizes sm (h-8), default (h-10, the Domiex .btn), lg (h-12). Default + disabled + loading
						states.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-wrap items-center gap-3">
						{#each buttonSizes as size (size)}
							<Button {variant} {size} aria-label="{variant} {size} default">
								{variant}
								{size}
							</Button>
						{/each}
						<Button {variant} disabled aria-label="{variant} disabled">disabled</Button>
						<Button {variant} loading aria-label="{variant} loading">loading</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</section>

	<!-- ═══ FIELDS ═══════════════════════════════════════════════════════ -->
	<Fields />

	<!-- ═══ OVERLAYS & FEEDBACK ══════════════════════════════════════════ -->
	<Overlays />

	<!-- ═══ CARDS ════════════════════════════════════════════════════════ -->
	<section aria-labelledby="cards-heading" class="stack stack-loose">
		<h2 id="cards-heading" class="h2">Cards</h2>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			<Card.Root padding="md" elevation="sm">
				<Card.Header>
					<Card.Title>Default</Card.Title>
					<Card.Description>elevation="sm" padding="md"</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="body-sm text-muted-foreground">Standard surface for most content.</p>
				</Card.Content>
			</Card.Root>

			<Card.Root padding="md" elevation="md" interactive>
				<Card.Header>
					<Card.Title>Interactive</Card.Title>
					<Card.Description>Spring lift on hover · scale on press</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="body-sm text-muted-foreground">For clickable grid items + dashboard widgets.</p>
				</Card.Content>
			</Card.Root>

			<Card.Root padding="md">
				<Card.Header>
					<Card.Title>Glass</Card.Title>
					<Card.Description>Frosted iOS-style surface</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="body-sm text-muted-foreground">For overlays + popovers + customiser panels.</p>
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<!-- ═══ ALERTS ═══════════════════════════════════════════════════════ -->
	<section aria-labelledby="alerts-heading" class="stack stack-loose">
		<h2 id="alerts-heading" class="h2">Alerts</h2>
		<div class="stack stack-tight">
			<Alert variant="info" title="Info">A neutral informational message.</Alert>
			<Alert variant="success" title="Success">An action completed successfully.</Alert>
			<Alert variant="warning" title="Warning">Heads-up — the user should know.</Alert>
			<Alert variant="destructive" title="Danger">Something failed and needs attention.</Alert>
		</div>
	</section>

	<!-- ═══ COLOUR PALETTES ══════════════════════════════════════════════ -->
	<section aria-labelledby="colors-heading" class="stack stack-loose">
		<h2 id="colors-heading" class="h2">Colour palette</h2>
		<p class="body-sm text-muted-foreground">
			OKLCH 11-stop scales — perceptually uniform lightness stepping. Each chip shows the token
			alias plus its stop number; hover for the CSS variable.
		</p>
		{#each semanticPalettes as palette (palette)}
			<div class="stack stack-tight">
				<h3 class="h4 capitalize">{palette}</h3>
				<div class="grid grid-cols-6 gap-1 lg:grid-cols-11">
					{#each brandShades as shade (shade)}
						<!-- Label OUTSIDE the chip so axe-core checks contrast against the
						     known page bg (text-muted-foreground is AA-safe), not against the
						     dynamically-coloured swatch — axe can't resolve var() inline
						     bgs on dark stops, false-positives the foreground span. -->
						<div class="stack stack-tight gap-1">
							<div
								class="border-border h-10 rounded-md border"
								style="background: var(--color-{palette}-{shade});"
								role="img"
								aria-label="{palette} {shade}"
								title="--color-{palette}-{shade}"
							></div>
							<span class="text-muted-foreground text-center font-mono text-[10px]">{shade}</span>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</section>

	<!-- ═══ THEME PICKER (programmatic API) ══════════════════════════════ -->
	<section aria-labelledby="theme-heading" class="stack stack-loose">
		<h2 id="theme-heading" class="h2">Theme picker</h2>
		<p class="body-sm text-muted-foreground">
			4 palettes. <strong>Iris</strong> is the default (logo). Picking re-skins the primary tokens
			instantly via a <code>&lt;html data-palette="X"&gt;</code> attribute swap.
		</p>
		<div class="flex flex-wrap gap-2">
			{#each PREFERENCE_VALUES.palette as id (id)}
				<button
					type="button"
					onclick={() => prefs.set({ palette: id })}
					class="interactive label border-border flex items-center gap-2 rounded-md border px-3 py-2"
					class:ring-2={prefs.palette === id}
					aria-pressed={prefs.palette === id}
				>
					{id}
				</button>
			{/each}
		</div>
	</section>

	<!-- ═══ GLASS SURFACES ═══════════════════════════════════════════════ -->
	<section aria-labelledby="frosted-heading" class="stack stack-loose">
		<h2 id="frosted-heading" class="h2">Glass surfaces</h2>
		<div
			class="relative h-64 overflow-hidden rounded-lg"
			style="background: linear-gradient(135deg, var(--primary-500), var(--success));"
		>
			<!-- rtl-allow: centered glass demo in styleguide catalog — physical
				center-positioning is the visual demonstration. -->
			<div
				class="bg-card border border-border rounded-md shadow-md absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg p-6"
			>
				<p class="h4">Frosted glass overlay</p>
				<p class="body-sm text-muted-foreground mt-2">
					Hover to see the sheen sweep. Composes bg-card border border-border rounded-md shadow-md +
					.
				</p>
			</div>
		</div>
	</section>

	<!-- ═══ SOLID MATERIALS ══════════════════════════════════════════════ -->
	<section aria-labelledby="materials-heading" class="stack stack-loose">
		<h2 id="materials-heading" class="h2">Materials</h2>
		<div class="bg-background flex flex-wrap items-center gap-4 rounded-lg p-6">
			{#each solidMaterials as [name, classes] (name)}
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
	</section>

	<!-- ═══ ICON BUTTON ══════════════════════════════════════════════════ -->
	<section aria-labelledby="icon-heading" class="stack stack-loose">
		<h2 id="icon-heading" class="h2">Icon buttons (44×44 — Apple HIG floor)</h2>
		<div class="flex flex-wrap items-center gap-3">
			{#each buttonVariants.filter((v) => v !== 'link') as variant (variant)}
				<Button {variant} size="icon" aria-label="{variant} icon">
					<Icon icon={Plus} size="md" />
				</Button>
			{/each}
		</div>
	</section>
</div>
