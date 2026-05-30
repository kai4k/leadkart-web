/**
 * `createPwa` — PWA lifecycle factory:
 *   - install eligibility (Chromium `beforeinstallprompt` event)
 *   - update availability (new service worker waiting)
 *   - online/offline status (browser online events)
 *
 * Svelte canon: a factory returning an object with reactive getters +
 * imperative actions + a `start(): cleanup` function the caller invokes
 * from `$effect`. No classes, no `this` — runes track through closure.
 *
 * Browser-only — SSR guard via `browser`. The `start()` function is the
 * single attach point; its return value is the cleanup that `$effect`
 * runs on teardown.
 *
 * Usage:
 *
 *   import { createPwa } from '$lib/hooks';
 *
 *   const pwa = createPwa();
 *   $effect(() => pwa.start());
 *
 *   {#if pwa.updateReady}<button onclick={pwa.applyUpdate}>Reload</button>{/if}
 */
import { browser } from '$app/environment';

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	prompt(): Promise<void>;
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface Pwa {
	readonly isOnline: boolean;
	readonly isInstallable: boolean;
	readonly updateReady: boolean;
	install(): Promise<boolean>;
	applyUpdate(): void;
	/**
	 * Wire all listeners and return a cleanup. Call from inside `$effect`:
	 *   $effect(() => pwa.start());
	 */
	start(): () => void;
}

export function createPwa(): Pwa {
	let isOnline = $state(browser ? navigator.onLine : true);
	let isInstallable = $state(false);
	let updateReady = $state(false);

	let installPrompt: BeforeInstallPromptEvent | null = null;
	let waitingWorker: ServiceWorker | null = null;

	function start(): () => void {
		if (!browser) return () => {};
		const cleanups: Array<() => void> = [];

		const onOnline = () => (isOnline = true);
		const onOffline = () => (isOnline = false);
		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);
		cleanups.push(() => window.removeEventListener('online', onOnline));
		cleanups.push(() => window.removeEventListener('offline', onOffline));

		const onBeforeInstall = (e: Event) => {
			e.preventDefault();
			installPrompt = e as BeforeInstallPromptEvent;
			isInstallable = true;
		};
		window.addEventListener('beforeinstallprompt', onBeforeInstall);
		cleanups.push(() => window.removeEventListener('beforeinstallprompt', onBeforeInstall));

		const onInstalled = () => {
			isInstallable = false;
			installPrompt = null;
		};
		window.addEventListener('appinstalled', onInstalled);
		cleanups.push(() => window.removeEventListener('appinstalled', onInstalled));

		if ('serviceWorker' in navigator) {
			void wireServiceWorker(cleanups);
		}

		return () => {
			for (const fn of cleanups) fn();
		};
	}

	async function wireServiceWorker(cleanups: Array<() => void>): Promise<void> {
		const reg = await navigator.serviceWorker.getRegistration();
		if (!reg) return;

		if (reg.waiting) {
			waitingWorker = reg.waiting;
			updateReady = true;
		}

		const onUpdateFound = () => {
			const installing = reg.installing;
			if (!installing) return;
			installing.addEventListener('statechange', () => {
				if (installing.state === 'installed' && navigator.serviceWorker.controller) {
					waitingWorker = installing;
					updateReady = true;
				}
			});
		};
		reg.addEventListener('updatefound', onUpdateFound);
		cleanups.push(() => reg.removeEventListener('updatefound', onUpdateFound));
	}

	async function install(): Promise<boolean> {
		if (!installPrompt) return false;
		await installPrompt.prompt();
		const choice = await installPrompt.userChoice;
		return choice.outcome === 'accepted';
	}

	function applyUpdate(): void {
		if (!waitingWorker) return;
		waitingWorker.postMessage({ type: 'SKIP_WAITING' });
		const reload = () => location.reload();
		navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
	}

	return {
		get isOnline() {
			return isOnline;
		},
		get isInstallable() {
			return isInstallable;
		},
		get updateReady() {
			return updateReady;
		},
		install,
		applyUpdate,
		start
	};
}
