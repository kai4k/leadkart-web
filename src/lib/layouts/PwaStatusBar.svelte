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
	 * authenticated pages. Each bar uses the same .bg-bg-elevated border border-border rounded-xl shadow-card material
	 * as toasts so the visual language is consistent.
	 */
	import { createPwa } from '$lib/hooks';
	import { Button } from '$ui';
	import { CloudOff, Download, RefreshCw, Icon } from '$icons';

	const pwa = createPwa();
	$effect(() => pwa.start());
</script>

<div
	class="pointer-events-none fixed start-1/2 -translate-x-1/2 z-[var(--z-banner)] flex flex-col items-center gap-2 px-4"
	style="inset-block-start: max(var(--lk-shell-gap), var(--safe-top, 0px));"
	aria-live="polite"
>
	{#if pwa.updateReady}
		<div
			class="bg-bg-elevated border border-border rounded-xl shadow-card border-primary pointer-events-auto flex max-w-md items-center gap-3 border-s-4 px-4 py-3 shadow-md"
			role="status"
		>
			<Icon icon={RefreshCw} size="sm" class="text-primary" />
			<div class="stack stack-tight flex-1">
				<p class="label text-fg font-semibold">Update available</p>
				<p class="caption text-fg-muted">A newer version of LeadKart is ready.</p>
			</div>
			<Button size="sm" onclick={() => pwa.applyUpdate()}>Reload</Button>
		</div>
	{/if}

	{#if !pwa.isOnline}
		<div
			class="bg-bg-elevated border border-border rounded-xl shadow-card border-warning-500 pointer-events-auto flex max-w-md items-center gap-3 border-s-4 px-4 py-3 shadow-md"
			role="status"
		>
			<Icon icon={CloudOff} size="sm" class="text-warning-700" />
			<div class="stack stack-tight flex-1">
				<p class="label text-fg font-semibold">You're offline</p>
				<p class="caption text-fg-muted">
					Changes will fail until you reconnect — read-only browsing still works.
				</p>
			</div>
		</div>
	{/if}

	{#if pwa.isInstallable && pwa.isOnline && !pwa.updateReady}
		<div
			class="bg-bg-elevated border border-border rounded-xl shadow-card pointer-events-auto flex max-w-md items-center gap-3 px-4 py-3 shadow-md"
			role="status"
		>
			<Icon icon={Download} size="sm" class="text-fg-muted" />
			<div class="stack stack-tight flex-1">
				<p class="label text-fg font-semibold">Install LeadKart</p>
				<p class="caption text-fg-muted">Use it like a native app, offline-capable.</p>
			</div>
			<Button size="sm" variant="tonal" onclick={() => pwa.install()}>Install</Button>
		</div>
	{/if}
</div>
