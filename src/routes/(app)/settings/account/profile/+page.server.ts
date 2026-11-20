/**
 * /settings/account/profile — load + form action.
 *
 * Load: GET /v1/users/{membershipId} server-side via goFetch
 *       (cookie → Bearer; scoped:false — the caller's own profile, never the operator scope).
 * Action: PATCH /v1/users/{membershipId}/profile with form data.
 *
 * The caller's membership_id is extracted from the JWT access cookie
 * (action handlers don't have access to parent layout data, so we
 * decode the principal claims directly).
 *
 * On success, SvelteKit auto-reruns the load to surface the new values
 * without a manual invalidate() call.
 */
import { redirect } from '@sveltejs/kit';
import {
	callGoForAction,
	failForm,
	failFromGo,
	failOutage,
	zodFieldMessages
} from '#lib/server/form-action.ts';
import { goFetch, readGoJson } from '#lib/server/go.ts';
import { updateProfileRequestSchema } from '$features/auth/schemas';
import { ownPrincipal } from '#lib/server/principal.ts';
import type { UserDto } from '$features/auth/types';
import type { Actions, PageServerLoad } from './$types';

const getMembershipId = (cookies: Parameters<typeof goFetch>[0]): string =>
	ownPrincipal(cookies).membershipId;

export const load: PageServerLoad = async ({ cookies }) => {
	const membershipId = getMembershipId(cookies);
	const resp = await goFetch(cookies, `/v1/users/${membershipId}`, { scoped: false });
	if (!resp.ok) {
		throw redirect(303, '/dashboard');
	}
	const profile = (await readGoJson<UserDto>(resp)) as UserDto;
	return { profile };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const membershipId = getMembershipId(cookies);
		const formData = await request.formData();
		const patch = {
			designation: (formData.get('designation') ?? '').toString(),
			department: (formData.get('department') ?? '').toString(),
			status_message: (formData.get('status_message') ?? '').toString()
		};

		const parsed = updateProfileRequestSchema.safeParse(patch);
		if (!parsed.success) {
			return failForm(422, { values: patch, fieldMessages: zodFieldMessages(parsed.error) });
		}

		const call = await callGoForAction(() =>
			goFetch(cookies, `/v1/users/${membershipId}/profile`, {
				method: 'PATCH',
				body: JSON.stringify(parsed.data),
				scoped: false
			})
		);
		if (!call.ok) return failOutage(call, patch);

		if (!call.resp.ok) return failFromGo(call.resp, patch);

		return { success: true };
	}
};
