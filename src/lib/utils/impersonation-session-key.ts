/** localStorage entry naming the operator's active impersonation session (user-specific). */
export const IMPERSONATION_SESSION_KEY = 'leadkart-impersonation-session';

/**
 * localStorage entry that is only a SIGNAL between tabs: its value changes whenever a tab starts or ends an
 * impersonation session, so the `storage` event wakes the other tabs to read the server's list. It carries no session
 * id and nothing sensitive; the server's list is the only truth about who is impersonating whom.
 */
export const IMPERSONATION_SIGNAL_KEY = 'leadkart-impersonation-signal';
