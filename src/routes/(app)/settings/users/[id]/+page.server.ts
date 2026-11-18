import { guardPage } from '#lib/server/guards.ts';

export const load = guardPage('identity.users.view');
