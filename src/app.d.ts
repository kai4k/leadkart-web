// See https://svelte.dev/docs/kit/types#app
// for information about these interfaces
import type { Capabilities } from '#lib/features/auth/api.ts';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/**
			 * Outcome of the silent refresh in hooks.server.ts; unset when none was
			 * attempted. `unavailable` = Go could not be reached: the session may be fine.
			 */
			refreshOutcome?: 'renewed' | 'none' | 'rejected' | 'unavailable';
		}
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
