import type { PageLoad } from './$types';

/**
 * Orders list — client-side load. The (app) +layout.server.ts has
 * already gated auth + baked capabilities into page.data. We just
 * pass through; TanStack Query owns the actual orders fetch on
 * client.
 */
export const load: PageLoad = () => {
	return {};
};
