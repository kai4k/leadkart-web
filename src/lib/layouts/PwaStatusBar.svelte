<script lang="ts">
	/**
	 * PwaStatusBar — surfaces the three PWA lifecycle states next to
	 * the global toaster:
	 *
	 *   - updateReady → toast-styled banner with "Reload" button.
	 *   - !isOnline → toast-styled banner reading "Offline — changes
	 *     will sync when you reconnect".
	 *   - isInstallable → toast-styled banner with "Install LeadKart"
	 *     button (Chromium-only; iOS Safari uses native Add-to-Home
	 *     Screen which lives outside our control).
	 *
	 * Mounted once from AppShell so the bars are always available on
	 * authenticated pages. Each bar uses the same card material (bg-card, border, shadow-md)
	 * as toasts so the visual language is consistent.
	 */
	import { _ } from 'svelte-i18n';
	import { createPwa } from '#lib/hooks/index.ts';
	import { Button } from '$ui';
	import { CloudOff, Download, RefreshCw, Icon } from '$icons';

	const pwa = createPwa();
	$effect(() => pwa.start());
</script>

<div
	class="pointer-events-none fixed start-1/2 -translate-x-1/2 z-[var(--z-banner)] flex flex-col items-center gap-2 px-4"
	style="inset-block-start: max(var(--shell-topbar-top), var(--safe-top, 0px));"
	aria-live="polite"
>
	{#if pwa.updateReady}
		<div
			class="bg-card border-border border-s-primary-indicator pointer-events-auto rounded-xl border flex max-w-3xl items-center gap-3 border-s-4 px-4 py-3 shadow-md"
			role="status"
		>
			<Icon icon={RefreshCw} size="sm" class="text-primary-text" />
			<div class="stack stack-tight flex-1">
				<p class="label text-foreground font-semibold">{$_('common.pwa.updateTitle')}</p>
				<p class="caption text-muted-foreground">{$_('common.pwa.updateBody')}</p>
			</div>
			<Button size="sm" onclick={() => pwa.applyUpdate()}>{$_('common.pwa.reload')}</Button>
		</div>
	{/if}

	{#if !pwa.isOnline}
		<div
			class="bg-card border-border border-s-warning-indicator pointer-events-auto rounded-xl border flex max-w-3xl items-center gap-3 border-s-4 px-4 py-3 shadow-md"
			role="status"
		>
			<Icon icon={CloudOff} size="sm" class="text-warning" />
			<div class="stack stack-tight flex-1">
				<p class="label text-foreground font-semibold">{$_('common.pwa.offlineTitle')}</p>
				<p class="caption text-muted-foreground">{$_('common.pwa.offlineBody')}</p>
			</div>
		</div>
	{/if}

	{#if pwa.isInstallable && pwa.isOnline && !pwa.updateReady}
		<div
			class="bg-card border-border pointer-events-auto rounded-xl border flex max-w-3xl items-center gap-3 px-4 py-3 shadow-md"
			role="status"
		>
			<Icon icon={Download} size="sm" class="text-muted-foreground" />
			<div class="stack stack-tight flex-1">
				<p class="label text-foreground font-semibold">{$_('common.pwa.installTitle')}</p>
				<p class="caption text-muted-foreground">{$_('common.pwa.installBody')}</p>
			</div>
			<Button size="sm" variant="tonal" onclick={() => pwa.install()}
				>{$_('common.pwa.install')}</Button
			>
		</div>
	{/if}
</div>
