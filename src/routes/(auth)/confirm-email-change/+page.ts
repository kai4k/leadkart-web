/**
 * Confirm-email-change: universal load (runs client-side since the `(auth)` group has `ssr = false`).
 *
 * The load only READS the token from `?token=`. It does not confirm anything: the token is single-use, and a
 * request made on page load is one a mail link scanner or a browser prefetch makes too, which would spend the
 * token before the person ever saw the page. The page asks for one click (`ConfirmEmailChangeView`), and that
 * click POSTs the token to the BFF endpoint `/auth/confirm-email-change`, which forwards to Go server-side.
 */
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => ({ token: url.searchParams.get('token') ?? '' });
