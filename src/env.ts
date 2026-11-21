import { defineEnvVars } from '@sveltejs/kit/env';
import { renderablePublicOrigin } from '#lib/config/public-origin.ts';

/**
 * Server env contract. Values pass through untouched (`undefined` when
 * unset) — the Zod schema in `#lib/server/config.ts` owns validation +
 * defaults, so a missing GO_API_URL still surfaces as the clear Zod
 * error on first request and NODE_ENV defaults to 'production' (fail closed).
 */
export const variables = defineEnvVars({
	GO_API_URL: { schema: (input) => input },
	NODE_ENV: { schema: (input) => input },
	SCOPE_COOKIE_SECRET: { schema: (input) => input },
	ORIGIN: { schema: (input) => input },
	PROTOCOL_HEADER: { schema: (input) => input },
	HOST_HEADER: { schema: (input) => input },
	UPSTREAM_TIMEOUT_MS: { schema: (input) => input },
	// Public origin for the link-preview tags in src/app.html (%sveltekit.env.PUBLIC_SITE_URL%). Public + dynamic:
	// read when the server starts. SvelteKit substitutes the RENDERED value into the template UNESCAPED, so the schema is
	// where it is made safe: exactly an origin passes (#lib/config/public-origin.ts), anything else renders '' (never the
	// raw value). Unset gives '' too, so the URLs degrade to root-relative in development. Production start-up refuses a
	// missing or malformed value (src/lib/server/config.ts).
	PUBLIC_SITE_URL: { public: true, schema: (input) => renderablePublicOrigin(input) }
});
