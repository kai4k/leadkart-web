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
	authoriseSelfService,
	callGoForAction,
	failForm,
	failFromGo,
	failOutage,
	zodFieldMessages
} from '#lib/server/form-action.ts';
import { goFetch, readGoJson } from '#lib/server/go.ts';
import { updateProfileRequestSchema } from '#lib/features/auth/schemas.ts';
import { ownPrincipal } from '#lib/server/principal.ts';
import type { UserDto } from '#lib/features/auth/types.ts';
import type { Actions, PageServerLoad } from './$types';

const getMembershipId = (cookies: Parameters<typeof goFetch>[0]): string =>
	ownPrincipal(cookies).membershipId;

export const load: PageServerLoad = async ({ cookies, parent }) => {
	// The section guard runs in the parent layout: wait for it before any Go call.
	await parent();
	const membershipId = getMembershipId(cookies);
	const resp = await goFetch(cookies, `/v1/users/${membershipId}`, { scoped: false });
	if (!resp.ok) {
		throw redirect(303, '/dashboard');
	}
	const profile = (await readGoJson<UserDto>(resp)) as UserDto;
	return { profile };
};

/** The typed profile fields: what a refused submit gives back to the form, and what is validated. */
const profilePatch = (formData: FormData) => ({
	designation: (formData.get('designation') ?? '').toString(),
	department: (formData.get('department') ?? '').toString(),
	status_message: (formData.get('status_message') ?? '').toString()
});

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		// The caller's own profile needs no permission, but the form must come from the page of the
		// person the browser holds now (session first, then the fingerprint).
		const refused = await authoriseSelfService(event, formData, () => profilePatch(formData));
		if (refused) return refused;
		const { cookies } = event;
		const patch = profilePatch(formData);
		const membershipId = getMembershipId(cookies);
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
