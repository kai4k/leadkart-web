/**
 * /settings/roles/new — form action.
 *
 * On success, redirects to the new role's detail page so the operator
 * can immediately assign permissions.
 */
import { fail, redirect } from '@sveltejs/kit';
import { callGoForAction, failFromGo } from '#lib/server/form-action.ts';
import { goFetch, readGoJson } from '#lib/server/go.ts';
import { createRoleRequestSchema } from '$features/roles/schemas';
import { P } from '#lib/features/auth/permissions.ts';
import { guardPage, requireCapability } from '#lib/server/guards.ts';
import { loadCapabilities } from '#lib/server/capabilities.ts';
import type { Actions } from './$types';

interface CreateRoleResponse {
	role_id: string;
}

export const load = guardPage(P.identityRolesCreate);

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		// Actions are a separate entry point from the load above: authorise here too.
		requireCapability(await loadCapabilities(cookies), P.identityRolesCreate);

		const fd = await request.formData();
		const payload = {
			name: (fd.get('name') ?? '').toString(),
			hierarchy_level: Number(fd.get('hierarchy_level') ?? 0)
		};

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
			const body = (await readGoJson<CreateRoleResponse>(call.resp)) as CreateRoleResponse;
			throw redirect(303, `/settings/roles/${body.role_id}`);
		}

		return failFromGo(call.resp, payload, { fallback: 'Create failed' });
	}
};
