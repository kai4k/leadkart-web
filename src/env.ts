import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Server env contract. Values pass through untouched (`undefined` when
 * unset) — the Zod schema in `#lib/server/config.ts` owns validation +
 * defaults, so a missing GO_API_URL still surfaces as the clear Zod
 * error on first request and NODE_ENV still defaults to 'development'.
 */
export const variables = defineEnvVars({
	GO_API_URL: { schema: (input) => input },
	NODE_ENV: { schema: (input) => input }
});
