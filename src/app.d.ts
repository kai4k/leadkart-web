// See https://svelte.dev/docs/kit/types#app
// for information about these interfaces
import type { Capabilities } from '$lib/features/auth/api';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			/**
			 * SSR-bootstrapped capabilities from the (app) root layout server load.
			 * Available in all (app) routes via $page.data.capabilities.
			 * Undefined in (auth) routes and the root layout.
			 */
			capabilities?: Capabilities;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
