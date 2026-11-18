/**
 * Validated server-side runtime configuration.
 *
 * One module owns env-var ingestion. Every server-side import touches
 * `config.X` here instead of reaching into `$app/env/private` directly.
 *
 * Why this matters:
 *   - Boot-time validation: if a required var is missing or malformed,
 *     the SvelteKit handle hook throws immediately on first request with
 *     a Zod error pointing at the offending key. No "undefined/api/v1/..."
 *     mystery in production logs.
 *   - Single source of truth: rename a key here and grep one file, not
 *     eight. Documentation lives next to the schema.
 *   - Typed downstream: `config.GO_API_URL` is `string`, not
 *     `string | undefined`. No optional-chaining noise in callers.
 *
 * Pattern reference: T3 env (create-t3-app), Stripe's internal config
 * loaders, Vercel's `process.env` validation pass at edge-function boot.
 *
 * The module is server-only (`#lib/server/*` is unreachable from
 * client bundles per SvelteKit's static analysis). Never import this
 * from a `.svelte` file or anything that ends up in the client graph.
 */
import {
	GO_API_URL,
	NODE_ENV,
	ORIGIN,
	SCOPE_COOKIE_SECRET,
	UPSTREAM_TIMEOUT_MS
} from '$app/env/private';

import { building, dev } from '$app/env';
import { z } from 'zod';

const DEV_SCOPE_SECRET = 'dev-only-scope-cookie-secret-not-for-production';

export const configSchema = z
	.object({
		/**
		 * URL the SvelteKit BFF uses to reach the Go API server-to-server.
		 * Never internet-facing — the Go service sits behind the reverse
		 * proxy or in the same K8s pod.
		 */
		GO_API_URL: z.string().url('GO_API_URL must be a valid URL (e.g. http://localhost:8080)'),

		/**
		 * Drives cookie `Secure` flag and the access-cookie name prefix:
		 *   - 'production': Secure=true, name '__Host-lk_access' (requires HTTPS)
		 *   - anything else: Secure=false, name 'lk_access' (HTTP dev / test)
		 *
		 * Fail closed: an unset NODE_ENV means production, so cookies get
		 * `Secure` and the `__Host-` prefix. Local dev and tests set it
		 * explicitly (`.env.local` sets 'development'; playwright sets 'test').
		 */
		NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),

		/** HMAC key for the operator-scope cookie. Required in production. */
		SCOPE_COOKIE_SECRET: z.string().min(32).optional(),

		/** Public origin, as given to adapter-node. Checked only when set. */
		ORIGIN: z.string().url().optional(),

		/** Timeout for every BFF → Go request. */
		UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000)
	})
	.superRefine((v, ctx) => {
		if (v.NODE_ENV !== 'production') return;
		if (!v.SCOPE_COOKIE_SECRET) {
			ctx.addIssue({
				code: 'custom',
				path: ['SCOPE_COOKIE_SECRET'],
				message: 'SCOPE_COOKIE_SECRET (32+ chars) is required in production'
			});
		}
		if (v.ORIGIN && !v.ORIGIN.startsWith('https://')) {
			ctx.addIssue({
				code: 'custom',
				path: ['ORIGIN'],
				message: 'ORIGIN must be https in production'
			});
		}
	})
	.transform((v) => ({ ...v, SCOPE_COOKIE_SECRET: v.SCOPE_COOKIE_SECRET ?? DEV_SCOPE_SECRET }));

export type Config = z.infer<typeof configSchema>;

/**
 * During `npm run build`, SvelteKit imports server modules to compile
 * the route tree. Production env vars aren't available in that phase
 * (and shouldn't be — the build artifact is environment-agnostic).
 * `building === true` lets us defer validation to first request.
 *
 * Production-deploy contract: the BFF process must have GO_API_URL set
 * in its runtime environment. The first request will surface a clear
 * Zod error if it's missing; the build never depends on it.
 */
function load(): Config {
	const parsed = configSchema.safeParse({
		GO_API_URL,
		// Schema default is 'production' (fail closed); under `vite dev` a fresh
		// clone without .env.local should still work.
		NODE_ENV: NODE_ENV || (dev ? 'development' : undefined),
		SCOPE_COOKIE_SECRET,
		ORIGIN,
		UPSTREAM_TIMEOUT_MS
	});

	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
			.join('\n');
		throw new Error(
			`Invalid server environment configuration:\n${issues}\n` +
				`Set the missing values in .env.local (or the deployment env) and restart.\n` +
				`See .env.example for the full key list.`
		);
	}
	return parsed.data;
}

// At build time `building === true` and we never touch the validated
// object — `config` stays as a getter-shaped proxy that throws if the
// build code accidentally reads from it. At runtime, the first import
// triggers `load()` and caches the result.
let cached: Config | null = null;

function get(): Config {
	if (cached) return cached;
	cached = load();
	return cached;
}

export const config = new Proxy({} as Config, {
	get(_t, key: string | symbol) {
		if (building) {
			throw new Error(
				`config.${String(key)} read during build — server config is runtime-only. ` +
					`If you need a value at build time, use a static: true env var in src/env.ts instead.`
			);
		}
		return get()[key as keyof Config];
	}
});

export const isProd = (): boolean => {
	if (building) return false;
	return get().NODE_ENV === 'production';
};
