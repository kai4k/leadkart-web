<script lang="ts" module>
	/** the locale key of the page title (the `<h1>`) for a status; the error page renders it */
	export function routeErrorTitleKey(status: number): string {
		return status === 404
			? 'errors.route.title.notFound'
			: status === 403
				? 'errors.route.title.forbidden'
				: 'errors.route.title.generic';
	}
</script>

<script lang="ts">
	/**
	 * The body of every `+error.svelte`: status-aware copy in a destructive Alert, inside a Card, and
	 * link-buttons (an `<a>` styled as a button: never a `<button>` in an `<a>`). No illustration and
	 * no gradient: a filler carries no design intent. It renders no heading itself; the error page
	 * puts the page's one `<h1>` (a `PageHeader` inside the app shell, a heading in the auth frame)
	 * above it. The brand mark is the one decoration.
	 */
	import { _ } from 'svelte-i18n';
	import { Alert, BrandMark, Button, Card } from '#lib/components/ui/index.ts';

	type Props = {
		status: number;
		/** the server's message, when it said something specific */
		message?: string;
		homeHref: string;
		homeLabel: string;
		/** a second action for a lost session */
		signInHref?: string;
	};
	let { status, message, homeHref, homeLabel, signInHref }: Props = $props();

	const copy = $derived(
		status === 404
			? $_('errors.route.notFound')
			: status === 403
				? $_('errors.route.forbidden')
				: $_('errors.route.generic')
	);
</script>

<Card.Root class="mx-auto w-full max-w-xl">
	<Card.Content class="flex flex-col items-start gap-5">
		<div class="flex items-center gap-3">
			<BrandMark decorative size="sm" />
			<p class="text-muted-foreground text-sm font-medium">
				{$_('errors.route.status', { values: { status } })}
			</p>
		</div>
		<Alert variant="destructive" title={copy} class="w-full">
			{#if message}<p>{message}</p>{/if}
		</Alert>
		<div class="flex flex-wrap items-center gap-3">
			<Button href={homeHref}>{homeLabel}</Button>
			{#if signInHref}
				<Button href={signInHref} variant="outline">{$_('errors.route.signIn')}</Button>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
