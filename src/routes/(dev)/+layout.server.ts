/**
 * The developer pages (`/styleguide`, `/data-table-bench`: everything in this group) are not part of
 * the product. Only `vite dev` and the e2e build (NODE_ENV=test) serve them; every other server
 * answers 404, production first. An unset NODE_ENV is not `test`, so it is refused too (fail closed,
 * like the rest of the server config).
 *
 * No session, no cookie and no call to Go: the pages hold no data, the gate only keeps them off a
 * public server.
 */
import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { NODE_ENV } from '$app/env/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => {
	if (!dev && NODE_ENV !== 'test') error(404, 'Not found');
	return {};
};
