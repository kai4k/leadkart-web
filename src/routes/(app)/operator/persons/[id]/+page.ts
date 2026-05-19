import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	if (!params.id) throw error(404, 'Person not found');
	return { personId: params.id };
};
