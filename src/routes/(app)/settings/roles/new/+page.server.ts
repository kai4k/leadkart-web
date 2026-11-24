/**
 * /settings/roles/new — form action.
 *
 * On success, redirects to the new role's detail page so the operator
 * can immediately assign permissions.
 */
import { redirect } from '@sveltejs/kit';
import {
	authoriseAction,
	callGoForAction,
	failForm,
	failFromGo,
	failOutage,
	UPSTREAM_UNAVAILABLE_KEY,
	zodFieldMessages
} from '#lib/server/form-action.ts';
import { formInt } from '#lib/server/form-int.ts';
import { goFetch, readGoJson } from '#lib/server/go.ts';
import { createRoleRequestSchema } from '#lib/features/roles/schemas.ts';
import { ACTION } from '#lib/features/auth/permissions.ts';
import { readOperatorScope } from '#lib/server/scope.ts';
import type { Actions } from './$types';

interface CreateRoleResponse {
	role_id: string;
}

/**
 * The typed role fields: what a refused submit gives back to the form, and what is validated. The
 * level is digits only (`formInt`): `1e1`, `0x10` or an empty field is refused by the schema, never
 * read as some other number.
 */
const rolePayload = (fd: FormData) => ({
	name: (fd.get('name') ?? '').toString(),
	hierarchy_level: formInt(fd, 'hierarchy_level')
});

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		// An action is a separate entry point from the page guard: authorise before anything else.
		const refused = await authoriseAction(event, fd, ACTION.roleCreate, () => rolePayload(fd));
		if (refused) return refused;
		const { cookies } = event;
		const payload = rolePayload(fd);

		const parsed = createRoleRequestSchema.safeParse(payload);
		if (!parsed.success) {
			return failForm(422, { values: payload, fieldMessages: zodFieldMessages(parsed.error) });
		}

		const call = await callGoForAction(() =>
			goFetch(cookies, '/v1/roles', { method: 'POST', body: JSON.stringify(parsed.data) })
		);
		if (!call.ok) return failOutage(call, payload);

		if (call.resp.ok) {
			// The body read is a Go call too (a stalled stream): it keeps the form like the call does.
			let body: CreateRoleResponse | null;
			try {
				body = await readGoJson<CreateRoleResponse>(call.resp);
			} catch {
				return failForm(502, { values: payload, formErrorKey: UPSTREAM_UNAVAILABLE_KEY });
			}
			if (!body?.role_id)
				return failForm(502, { values: payload, formErrorKey: 'auth.errors.unexpected' });
			// An operator creating in a tenant context has no role detail page there: back to the tenant's roles.
			if (readOperatorScope(cookies).state === 'valid')
				throw redirect(303, '/operator/scope/roles');
			throw redirect(303, `/settings/roles/${encodeURIComponent(body.role_id)}`);
		}

		return failFromGo(call.resp, payload);
	}
};
