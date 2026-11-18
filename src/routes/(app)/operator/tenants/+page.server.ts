import { guardPage, OPERATOR_SCOPE_PERMISSION } from '#lib/server/guards.ts';

export const load = guardPage(OPERATOR_SCOPE_PERMISSION);
