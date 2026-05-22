/**
 * (app) route group client-side layout load.
 *
 * The auth guard + capabilities bootstrap now runs server-side in
 * +layout.server.ts. This client load simply passes data through.
 * LayoutLoad still needs to exist for SvelteKit to pick up the server
 * data correctly on client-side navigation.
 */
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ data }) => {
	// capabilities is already in data from +layout.server.ts
	return data;
};
