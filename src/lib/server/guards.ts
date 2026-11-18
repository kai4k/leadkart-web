import { redirect } from '@sveltejs/kit';
// Pure module imported directly: the auth barrel re-exports .svelte components.
import { hasCapability, type Capabilities } from '#lib/features/auth/capabilities.ts';

/**
 * Server-side route guard. Runs in a `+page.server.ts` / `+layout.server.ts`
 * load, so an unauthorised user never receives the page or its data.
 * Behaviour matches the old client guard: back to the dashboard.
 */
export function requireCapability(caps: Capabilities | undefined, permission: string): void {
	if (!hasCapability(caps, permission)) redirect(303, '/dashboard');
}
