<script lang="ts">
	/**
	 * AuthShell: the frame of every signed-out page. The surface follows the user's mode and primary
	 * like every other page (`<html data-mode data-colors>` from the SSR cookie): nothing is locked to
	 * light values.
	 *
	 *   <div frame>
	 *     AuthBackdrop            decorative field, aria-hidden
	 *     <header>                the brand row, below lg only
	 *     <aside aria-label>      AuthBrandPanel, lg and up (hidden, so out of the a11y tree, below)
	 *     <main#main-content>     the page form: the skip link lands here, the form owns the <h1>
	 *
	 * One brand mark per screen: the aside on desktop, the header row on mobile.
	 */
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { BrandMark } from '$ui';
	import AuthBackdrop from './AuthBackdrop.svelte';
	import AuthBrandPanel from './AuthBrandPanel.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="bg-background text-foreground relative isolate min-h-dvh overflow-hidden">
	<AuthBackdrop />

	<div class="relative z-10 grid min-h-dvh grid-cols-1 lg:grid-cols-2">
		<header
			class="bg-primary-soft text-primary-text border-border flex items-center justify-between border-b px-4 py-4 sm:px-6 lg:hidden"
		>
			<BrandMark wordmark />
			<span class="text-sm font-medium">{$_('auth.brand.mobileTag')}</span>
		</header>

		<aside
			aria-label={$_('common.brandName')}
			class="hidden p-[clamp(2.5rem,5vw,4rem)] lg:flex lg:flex-col lg:justify-center"
		>
			<div class="mx-auto w-full max-w-[clamp(20rem,32vw,36rem)]">
				<AuthBrandPanel />
			</div>
		</aside>

		<main
			id="main-content"
			tabindex="-1"
			class="flex items-center justify-center p-[clamp(1.5rem,4vw,3rem)] outline-none"
		>
			<div class="w-full max-w-[min(28rem,100%)]">
				{@render children()}
			</div>
		</main>
	</div>
</div>
