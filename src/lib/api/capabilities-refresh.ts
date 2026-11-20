/**
 * How the session's capabilities (`session.capabilities` / `session.principal`, the ONE source
 * every reader uses) stay fresh. They are the (app) layout's server load; nothing refetches
 * them on its own, so the app invalidates that load when the caller's own access may have
 * changed: after a mutation that changes roles or permissions (`refreshesCapabilities` on the
 * mutation) and when the window regains focus after a while (`useRefreshOnFocus`).
 */
import { invalidate } from '$app/navigation';

/** SvelteKit dependency key the (app) layout load declares for the capabilities it returns. */
export const CAPABILITIES_DEPENDENCY = 'app:capabilities';

/** Re-run the (app) layout load: the nav, the guards and `session.can` follow what Go now says. */
export function refreshCapabilities(): Promise<void> {
	return invalidate(CAPABILITIES_DEPENDENCY);
}
