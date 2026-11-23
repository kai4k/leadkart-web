/**
 * A form action answered with the redirect that changed who this browser is signed in as: a sign-in
 * (somebody is now), or a password change that ended the session (nobody is). The other tabs still
 * show the person from before; they reload now instead of collecting refusals on their next call.
 * `ActionForm` calls this through `onResult`, after the page followed the redirect.
 */
import type { ActionResult } from '$app/forms';
import { announceContextChange } from '#lib/api/operator-scope.ts';

export function announceSessionChange(result: ActionResult): void {
	if (result.type === 'redirect') announceContextChange('session');
}
