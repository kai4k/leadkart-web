<script lang="ts">
	/**
	 * Design-system styleguide — every Button variant × size × state, Card
	 * variants and Alerts here; fields in Fields.svelte, overlays in
	 * Overlays.svelte, and the foundations (palette × mode, colour roles, type,
	 * space, radius, materials, motion) in Foundations.svelte.
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

	const buttonVariants = ['primary', 'tonal', 'secondary', 'ghost', 'destructive', 'link'] as const;
	const buttonSizes = ['sm', 'md', 'lg'] as const;
</script>

<svelte:head>
	<title>Design system · LeadKart</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main id="main-content" class="container-page stack stack-loose py-8" tabindex="-1">
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
			<Card.Root padding="lg">
				<Card.Header>
					<Card.Title>variant="{variant}"</Card.Title>
					<Card.Description>
						Sizes sm (h-9), md (h-11), lg (h-13). Default + disabled + loading states.
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
			<Card.Root padding="md">
				<Card.Header>
					<Card.Title>Clay</Card.Title>
					<Card.Description>surface="clay" (the default) padding="md"</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="body-sm text-muted-foreground">Standard surface for most content.</p>
				</Card.Content>
			</Card.Root>

			<Card.Root padding="md" interactive>
				<Card.Header>
					<Card.Title>Interactive</Card.Title>
					<Card.Description>Spring lift on hover · scale on press</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="body-sm text-muted-foreground">For clickable grid items + dashboard widgets.</p>
				</Card.Content>
			</Card.Root>

			<Card.Root padding="md" surface="sheet">
				<Card.Header>
					<Card.Title>Sheet</Card.Title>
					<Card.Description>surface="sheet"</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="body-sm text-muted-foreground">A working surface a table or a form sits on.</p>
				</Card.Content>
			</Card.Root>

			<Card.Root padding="md" surface="tray">
				<Card.Header>
					<Card.Title>Tray</Card.Title>
					<Card.Description>surface="tray"</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="body-sm text-muted-foreground">
						A recessed holder for a group of related things.
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
			<Alert variant="destructive" title="Danger">Something failed and needs attention.</Alert>
			<Alert variant="tray" tone="warning">Two batches are in quarantine.</Alert>
			<Alert variant="tray" tone="danger">Three customers are overdue.</Alert>
			<Alert variant="tray" tone="info">Prices update at midnight.</Alert>
			<Alert variant="tray" tone="neutral">Nothing needs doing.</Alert>
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
</main>
