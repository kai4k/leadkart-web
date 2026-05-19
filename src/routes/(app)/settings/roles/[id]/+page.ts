import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	if (!params.id) throw error(404, 'Role not found');
	return { roleId: params.id };
};
