import type { PageLoad } from './$types';

/** Order detail — client-side load; TanStack handles the detail fetch. */
export const load: PageLoad = ({ params }) => {
	return { id: params.id };
};
