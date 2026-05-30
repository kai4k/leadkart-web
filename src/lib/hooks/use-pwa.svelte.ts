/**
 * `UsePwa` — singleton-shaped reactive store for PWA lifecycle:
 *   - install eligibility (Chromium `beforeinstallprompt` event)
 *   - update availability (new service worker waiting)
 *   - online/offline status (browser online events)
 *
 * Mounted once in `AppShell` (or `+layout.svelte`) on the client. Other
 * components read `pwa.isInstallable`, `pwa.isOnline`, `pwa.updateReady`
 * to render install/update CTAs and an offline badge.
 *
 * Class-based with `$state` fields per CLAUDE.md rule 4. Browser-only —
 * SSR guard via `browser` import; all listeners are wired inside an
 * `attach()` method the caller invokes in an `$effect`.
 */
import { browser } from '$app/environment';

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	prompt(): Promise<void>;
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class UsePwa {
	isOnline: boolean = $state(browser ? navigator.onLine : true);
	isInstallable: boolean = $state(false);
	updateReady: boolean = $state(false);

	#installPrompt: BeforeInstallPromptEvent | null = null;
	#waitingWorker: ServiceWorker | null = null;
	#detachers: Array<() => void> = [];

	/**
	 * Wire all listeners. Call once from an `$effect` in the root layout:
	 *
	 *   const pwa = new UsePwa();
	 *   $effect(() => pwa.attach());
	 *
	 * Returns the cleanup function so Svelte can detach on unmount.
	 */
	attach(): () => void {
		if (!browser) return () => {};

		const onOnline = () => (this.isOnline = true);
		const onOffline = () => (this.isOnline = false);
		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);
		this.#detachers.push(() => window.removeEventListener('online', onOnline));
		this.#detachers.push(() => window.removeEventListener('offline', onOffline));

		const onBeforeInstall = (e: Event) => {
			e.preventDefault();
			this.#installPrompt = e as BeforeInstallPromptEvent;
			this.isInstallable = true;
		};
		window.addEventListener('beforeinstallprompt', onBeforeInstall);
		this.#detachers.push(() => window.removeEventListener('beforeinstallprompt', onBeforeInstall));

		const onInstalled = () => {
			this.isInstallable = false;
			this.#installPrompt = null;
		};
		window.addEventListener('appinstalled', onInstalled);
		this.#detachers.push(() => window.removeEventListener('appinstalled', onInstalled));

		if ('serviceWorker' in navigator) {
			void this.#wireServiceWorker();
		}

		return () => this.detach();
	}

	detach(): void {
		for (const fn of this.#detachers) fn();
		this.#detachers = [];
	}

	/**
	 * Show the install prompt. Returns true if accepted, false if dismissed
	 * or unavailable. Chromium fires `appinstalled` after acceptance, which
	 * clears `isInstallable`.
	 */
	async install(): Promise<boolean> {
		const prompt = this.#installPrompt;
		if (!prompt) return false;
		await prompt.prompt();
		const choice = await prompt.userChoice;
		return choice.outcome === 'accepted';
	}

	/**
	 * Apply the waiting service worker (skip the wait-for-tabs-to-close
	 * step). Reloads the page so the new bundle takes effect.
	 */
	applyUpdate(): void {
		const waiting = this.#waitingWorker;
		if (!waiting) return;
		waiting.postMessage({ type: 'SKIP_WAITING' });
		const reload = () => location.reload();
		navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
	}

	async #wireServiceWorker(): Promise<void> {
		const reg = await navigator.serviceWorker.getRegistration();
		if (!reg) return;

		if (reg.waiting) {
			this.#waitingWorker = reg.waiting;
			this.updateReady = true;
		}

		const onUpdateFound = () => {
			const installing = reg.installing;
			if (!installing) return;
			installing.addEventListener('statechange', () => {
				if (installing.state === 'installed' && navigator.serviceWorker.controller) {
					this.#waitingWorker = installing;
					this.updateReady = true;
				}
			});
		};
		reg.addEventListener('updatefound', onUpdateFound);
		this.#detachers.push(() => reg.removeEventListener('updatefound', onUpdateFound));
	}
}
