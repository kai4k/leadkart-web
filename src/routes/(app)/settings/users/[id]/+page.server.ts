import { requireCapability } from '#lib/server/guards.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { capabilities } = await parent();
	requireCapability(capabilities, 'identity.users.view');
};
