/**
 * /settings/account/profile — load + form action.
 *
 * Load: GET /v1/users/{membershipId} server-side via goFetch
 *       (cookie → Bearer + scope header injection).
 * Action: PATCH /v1/users/{membershipId}/profile with form data.
 *
 * The caller's membership_id is extracted from the JWT access cookie
 * (action handlers don't have access to parent layout data, so we
 * decode the principal claims directly).
 *
 * On success, SvelteKit auto-reruns the load to surface the new values
 * without a manual invalidate() call.
 */
import { fail, redirect } from '@sveltejs/kit';
import { goFetch, readGoJson, readGoError, flattenGoErrors } from '$lib/server/go';
import { updateProfileRequestSchema } from '$features/auth/schemas';
import { decodeJwtPrincipal } from '$api/jwt';
import { ACCESS_COOKIE } from '$lib/server/cookies';
import type { UserDto } from '$features/auth/types';
import type { Actions, PageServerLoad } from './$types';

function getMembershipId(cookies: Parameters<typeof goFetch>[0]): string {
	const access = cookies.get(ACCESS_COOKIE());
	if (!access) throw redirect(303, '/signin');
	return decodeJwtPrincipal(access).membershipId;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const membershipId = getMembershipId(cookies);
	const resp = await goFetch(cookies, `/v1/users/${membershipId}`);
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
			return fail(422, {
				values: patch,
				errors: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
			});
		}

		const resp = await goFetch(cookies, `/v1/users/${membershipId}/profile`, {
			method: 'PATCH',
			body: JSON.stringify(parsed.data)
		});

		if (!resp.ok) {
			const body = await readGoError(resp);
			if (resp.status === 422) {
				return fail(422, { values: patch, errors: flattenGoErrors(body) });
			}
			return fail(resp.status, { values: patch, bannerError: body.detail ?? 'Save failed' });
		}

		return { success: true };
	}
};
