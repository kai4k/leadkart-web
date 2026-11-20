/**
 * (app) route group client-side layout load.
 *
 * The auth guard + capabilities bootstrap runs server-side in +layout.server.ts. This load passes
 * that data through and, in the browser, hands the page's tenant-context fingerprint to the API
 * client: every call carries it, and the BFF refuses a call whose page shows another context than
 * the (shared) scope cookie names now. It reruns whenever the server data does, so the holder
 * follows enter / exit / refresh. Never on the server: a module value there is shared by requests.
 */
import { browser } from '$app/env';
import { pageScopeContext } from '#lib/api/scope-context.ts';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ data }) => {
	if (browser) pageScopeContext.set(data.scopeContext);
	return data;
};
