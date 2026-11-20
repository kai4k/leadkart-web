import { guardAppRoute } from '#lib/server/guards.ts';

/** Every page under this section is guarded by its entry in the nav config (see `guardAppRoute`). */
export const load = guardAppRoute;
