// See https://svelte.dev/docs/kit/types#app
// for information about these interfaces
import type { Capabilities } from '#lib/features/auth/api.ts';
import type { AppLocale } from '#lib/i18n/index.ts';
import type { Preferences } from '#lib/features/preferences/schema.ts';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** The decoded `lk_ui` cookie (presentation only), set by htmlShellHandle. */
			preferences: Preferences;
			/** The request's language, negotiated from Accept-Language by htmlShellHandle. */
			locale: AppLocale;
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
			/**
			 * The `lk_csrf` double-submit value from the root layout server load (null when there is no
			 * session). The error page puts it in its sign-out form so signing out works without JS.
			 */
			csrfToken?: string | null;
			/** The decoded `lk_ui` cookie from the root layout server load (presentation only). */
			preferences?: Preferences;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
