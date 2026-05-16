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
	import { Button, Card, Alert } from '$lib/components/ui';
	import { PRIMARY_COLORS, theme } from '$lib/stores/theme.svelte';
	import { Plus } from 'lucide-svelte';

	const buttonVariants = [
		'primary',
		'secondary',
		'tonal',
		'ghost',
		'danger',
		'glass',
		'link'
	] as const;
	const buttonSizes = ['sm', 'md', 'lg'] as const;
	const brandShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
	const semanticPalettes = ['brand', 'secondary', 'success', 'warning', 'danger', 'info', 'gray'];
</script>

<svelte:head>
	<title>Design system · LeadKart</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="container-page stack stack-loose py-8">
	<header class="stack stack-tight">
		<h1 class="display-1">LeadKart design system</h1>
		<p class="body-lg text-[var(--color-fg-muted)]">
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
						Sizes sm (h-9, 36px), md (h-11, 44px — Apple HIG floor), lg (h-12, 48px — Material 3
						floor). Default + disabled + loading states.
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
					<p class="body-sm text-[var(--color-fg-muted)]">Standard surface for most content.</p>
				</Card.Content>
			</Card.Root>

			<Card.Root padding="md" elevation="md" interactive>
				<Card.Header>
					<Card.Title>Interactive</Card.Title>
					<Card.Description>Spring lift on hover · scale on press</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="body-sm text-[var(--color-fg-muted)]">
						For clickable grid items + dashboard widgets.
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root padding="md" surface="glass">
				<Card.Header>
					<Card.Title>Glass</Card.Title>
					<Card.Description>Frosted iOS-style surface</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="body-sm text-[var(--color-fg-muted)]">
						For overlays + popovers + customiser panels.
					</p>
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
			<Alert variant="danger" title="Danger">Something failed and needs attention.</Alert>
		</div>
	</section>

	<!-- ═══ COLOUR PALETTES ══════════════════════════════════════════════ -->
	<section aria-labelledby="colors-heading" class="stack stack-loose">
		<h2 id="colors-heading" class="h2">Colour palette</h2>
		<p class="body-sm text-[var(--color-fg-muted)]">
			OKLCH 11-stop scales — perceptually uniform lightness stepping. Each chip shows the token
			alias plus its stop number; hover for the CSS variable.
		</p>
		{#each semanticPalettes as palette (palette)}
			<div class="stack stack-tight">
				<h3 class="h4 capitalize">{palette}</h3>
				<div class="grid grid-cols-6 gap-1 lg:grid-cols-11">
					{#each brandShades as shade (shade)}
						<!-- Label OUTSIDE the chip so axe-core checks contrast against the
						     known page bg (text-fg-muted is AA-safe), not against the
						     dynamically-coloured swatch — axe can't resolve var() inline
						     bgs on dark stops, false-positives the foreground span. -->
						<div class="stack stack-tight gap-1">
							<div
								class="h-10 rounded-md border border-[var(--color-border)]"
								style="background: var(--color-{palette}-{shade});"
								role="img"
								aria-label="{palette} {shade}"
								title="--color-{palette}-{shade}"
							></div>
							<span class="text-center font-mono text-[10px] text-[var(--color-fg-muted)]"
								>{shade}</span
							>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</section>

	<!-- ═══ THEME PICKER (programmatic API) ══════════════════════════════ -->
	<section aria-labelledby="theme-heading" class="stack stack-loose">
		<h2 id="theme-heading" class="h2">Theme picker</h2>
		<p class="body-sm text-[var(--color-fg-muted)]">
			11 primary colour choices. <strong>Navy</strong> is the default (logo wordmark). Picking
			re-skins every <code>--color-brand-*</code> token instantly via a
			<code>&lt;html data-primary="X"&gt;</code> attribute swap.
		</p>
		<div class="flex flex-wrap gap-2">
			{#each PRIMARY_COLORS as { id, label, hex } (id)}
				<button
					type="button"
					onclick={() => theme.setPrimary(id)}
					class="interactive label flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2"
					class:ring-2={theme.primary === id}
					aria-pressed={theme.primary === id}
				>
					<span
						aria-hidden="true"
						class="h-4 w-4 rounded-full border border-[var(--color-border)]"
						style="background: {hex};"
					></span>
					{label}
				</button>
			{/each}
		</div>
	</section>

	<!-- ═══ GLASS SURFACES ═══════════════════════════════════════════════ -->
	<section aria-labelledby="glass-heading" class="stack stack-loose">
		<h2 id="glass-heading" class="h2">Glass surfaces</h2>
		<div
			class="relative h-64 overflow-hidden rounded-lg"
			style="background: linear-gradient(135deg, var(--color-brand-500), var(--color-secondary-500));"
		>
			<div
				class="glass-popover glass-sheen absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg p-6"
			>
				<p class="h4">Frosted glass overlay</p>
				<p class="body-sm mt-2 text-[var(--color-fg-muted)]">
					Hover to see the sheen sweep. Composes glass-popover + glass-sheen.
				</p>
			</div>
		</div>
	</section>

	<!-- ═══ ICON BUTTON ══════════════════════════════════════════════════ -->
	<section aria-labelledby="icon-heading" class="stack stack-loose">
		<h2 id="icon-heading" class="h2">Icon buttons (44×44 — Apple HIG floor)</h2>
		<div class="flex flex-wrap items-center gap-3">
			{#each buttonVariants.filter((v) => v !== 'link') as variant (variant)}
				<Button {variant} size="icon" aria-label="{variant} icon">
					<Plus size={18} aria-hidden="true" />
				</Button>
			{/each}
		</div>
	</section>
</div>
