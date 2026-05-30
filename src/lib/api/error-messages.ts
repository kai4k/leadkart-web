/**
 * Shared resource-list error → user-facing message helper.
 *
 * Five list components (Users, Tenants, Orders, Roles, Permission Requests)
 * derived the same error → message switch over `ApiError` subclasses. Rule
 * of Three triggered at the fourth instance — pulled into one place so the
 * copy stays consistent and new list views pick up the same UX for free.
 *
 * The only per-call variation is the resource noun in the 403 case
 * ("view tenants" vs "view users" vs "view orders"). Callers pass it.
 *
 * Usage in a list component:
 *
 *   const listErrorCopy = $derived(getListErrorMessage(query.error, 'tenants'));
 *
 * Returns `null` when there is no error so the template can `{#if listErrorCopy}`.
 */
import { AuthError, NetworkError, NotFoundError } from '$api/errors';

/**
 * Map an `ApiError` subclass to a user-facing copy line. Returns `null`
 * for `null`/`undefined` so call sites can pass `query.error` directly
 * and short-circuit when no error is present.
 *
 * `resourceNoun` should be a plural lower-cased noun ("tenants",
 * "team members", "orders") that fits in "You don't have permission
 * to view {noun}." — used for the 403 branch.
 */
export function getListErrorMessage(err: unknown, resourceNoun: string): string | null {
	if (!err) return null;
	if (err instanceof NetworkError) {
		return 'Check your network connection and try again.';
	}
	if (err instanceof AuthError) {
		return err.status === 403
			? `You don't have permission to view ${resourceNoun}.`
			: 'Your session expired. Sign in again.';
	}
	if (err instanceof NotFoundError) {
		return 'This resource was deleted or moved.';
	}
	return 'Something went wrong. Please try again.';
}
