/**
 * /settings/roles/new — form action.
 *
 * On success, redirects to the new role's detail page so the operator
 * can immediately assign permissions.
 */
import { fail, redirect } from '@sveltejs/kit';
import {
	authoriseAction,
	callGoForAction,
	failFromGo,
	goFailureKey,
	UPSTREAM_UNAVAILABLE_KEY
} from '#lib/server/form-action.ts';
import { goFetch, readGoJson } from '#lib/server/go.ts';
import { createRoleRequestSchema } from '$features/roles/schemas';
import { P } from '#lib/features/auth/permissions.ts';
import type { Actions } from './$types';

interface CreateRoleResponse {
	role_id: string;
}

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const fd = await request.formData();
		const payload = {
			name: (fd.get('name') ?? '').toString(),
			hierarchy_level: Number(fd.get('hierarchy_level') ?? 0)
		};

		// An action is a separate entry point from the page guard: authorise before any Go call.
		const refused = await authoriseAction(cookies, P.identityRolesCreate, payload);
		if (refused) return refused;

		const parsed = createRoleRequestSchema.safeParse(payload);
		if (!parsed.success) {
			return fail(422, {
				values: payload,
				errors: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
			});
		}

		const call = await callGoForAction(() =>
			goFetch(cookies, '/v1/roles', { method: 'POST', body: JSON.stringify(parsed.data) })
		);
		if (!call.ok) return fail(call.status, { values: payload, formErrorKey: call.key });

		if (call.resp.ok) {
			// The body read is a Go call too (a stalled stream): it keeps the form like the call does.
			let body: CreateRoleResponse | null;
			try {
				body = await readGoJson<CreateRoleResponse>(call.resp);
			} catch {
				return fail(502, { values: payload, formErrorKey: UPSTREAM_UNAVAILABLE_KEY });
			}
			if (!body?.role_id) return fail(502, { values: payload, formErrorKey: goFailureKey(502) });
			throw redirect(303, `/settings/roles/${encodeURIComponent(body.role_id)}`);
		}

		return failFromGo(call.resp, payload, { fallback: 'Create failed' });
	}
};
