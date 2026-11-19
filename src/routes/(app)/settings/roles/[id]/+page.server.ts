import { P } from '#lib/features/auth/permissions.ts';
import { guardPage } from '#lib/server/guards.ts';

export const load = guardPage(P.identityRolesView);
