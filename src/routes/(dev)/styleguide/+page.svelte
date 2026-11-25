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
	import { Icon, Plus } from '#lib/icons/index.ts';
	import Fields from './Fields.svelte';
	import Foundations from './Foundations.svelte';
	import Overlays from './Overlays.svelte';

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

	<!-- ═══ FOUNDATIONS (palette x mode, roles, type, space, radius, materials, motion) ═══ -->
	<Foundations />

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
