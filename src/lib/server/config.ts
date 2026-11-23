/**
 * Validated server-side runtime configuration.
 *
 * One module owns env-var ingestion. Every server-side import touches
 * `config.X` here instead of reaching into `$app/env/private` directly.
 *
 * Why this matters:
 *   - Boot-time validation: the server `init` hook (hooks.server.ts) reads
 *     `config` once, so a missing or malformed var stops the process at
 *     startup with a Zod error pointing at the offending key. No
 *     "undefined/api/v1/..." mystery in production logs.
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
	HOST_HEADER,
	NODE_ENV,
	ORIGIN,
	PROTOCOL_HEADER,
	SCOPE_COOKIE_SECRET,
	UPSTREAM_TIMEOUT_MS
} from '$app/env/private';

import { PUBLIC_SITE_URL } from '$app/env/public';
import { building, dev } from '$app/env';
import { z } from 'zod';
import { isPublicOrigin } from '#lib/config/public-origin.ts';
import {
	BFF_MAX_UPSTREAM_HOPS,
	DEFAULT_READ_TIMEOUT_MS,
	DEFAULT_UPSTREAM_TIMEOUT_MS
} from '#lib/api/timeouts.ts';

const DEV_SCOPE_SECRET = 'dev-only-scope-cookie-secret-not-for-production';
/** Prefix of the published e2e secret (`preview:e2e`, playwright.config.ts). */
const E2E_SECRET_PREFIX = 'e2e-only';

/** An origin whose host is this machine, by exact hostname (never by prefix or suffix). */
function isLocalOrigin(origin: string | undefined): boolean {
	if (!origin) return false;
	try {
		return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname);
	} catch {
		return false;
	}
}

/** Empty env values (`KEY=` in a copied .env file) mean "unset". */
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

/**
 * `allowDevSecret` is Kit's `dev` flag (vite dev server). Only then may the
 * public in-source fallback sign the operator-scope cookie; every built
 * server (preview, e2e, production) must supply SCOPE_COOKIE_SECRET.
 */
export function createConfigSchema({ allowDevSecret }: { allowDevSecret: boolean }) {
	return z
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

			/** HMAC key for the operator-scope cookie. Required unless `allowDevSecret`. */
			SCOPE_COOKIE_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),

			/** Public origin, as given to adapter-node. Checked only when set. */
			ORIGIN: z.preprocess(
				emptyToUndefined,
				z
					.string()
					.url()
					.refine((v) => new URL(v).origin === v, 'ORIGIN must be a bare origin (no path)')
					.optional()
			),

			/**
			 * Public origin written into the link-preview tags of src/app.html (og:url, og:image, twitter:image).
			 * Empty or exactly a bare origin (the rule is #lib/config/public-origin.ts, shared with src/env.ts, which renders the
			 * value into app.html): no path, trailing slash, credentials, query, fragment or character outside the origin grammar.
			 * https, or http outside production. Required in production (superRefine).
			 */
			PUBLIC_SITE_URL: z.preprocess(
				emptyToUndefined,
				z
					.string()
					.refine(
						isPublicOrigin,
						'PUBLIC_SITE_URL must be a bare origin (e.g. https://app.example.com): no path, trailing slash, credentials, query or fragment'
					)
					.optional()
			),

			/**
			 * adapter-node reads these to build the request origin behind a
			 * TLS-terminating proxy. Validated here only for presence: production
			 * needs ORIGIN or both, or Kit's origin check rejects every form action.
			 */
			PROTOCOL_HEADER: z.preprocess(emptyToUndefined, z.string().optional()),
			HOST_HEADER: z.preprocess(emptyToUndefined, z.string().optional()),

			/**
			 * Timeout for every BFF → Go request. The proxy may chain up to three of them
			 * (attempt → refresh → retry), so the browser client's read timeout must exceed
			 * 3 × this (see `#lib/api/timeouts.ts`); raise this and that budget together.
			 */
			UPSTREAM_TIMEOUT_MS: z.preprocess(
				emptyToUndefined,
				z.coerce.number().int().positive().default(DEFAULT_UPSTREAM_TIMEOUT_MS)
			)
		})
		.superRefine((v, ctx) => {
			if (!v.SCOPE_COOKIE_SECRET && !allowDevSecret) {
				ctx.addIssue({
					code: 'custom',
					path: ['SCOPE_COOKIE_SECRET'],
					message: 'SCOPE_COOKIE_SECRET (32+ chars) is required'
				});
			}
			// The browser aborting mid-refresh makes Go's refresh-token reuse detection end the
			// session (see api/timeouts.ts), so this holds in every environment.
			if (BFF_MAX_UPSTREAM_HOPS * v.UPSTREAM_TIMEOUT_MS >= DEFAULT_READ_TIMEOUT_MS) {
				ctx.addIssue({
					code: 'custom',
					path: ['UPSTREAM_TIMEOUT_MS'],
					message:
						`UPSTREAM_TIMEOUT_MS (${v.UPSTREAM_TIMEOUT_MS}) x ${BFF_MAX_UPSTREAM_HOPS} upstream hops = ` +
						`${BFF_MAX_UPSTREAM_HOPS * v.UPSTREAM_TIMEOUT_MS} ms must stay below the client read timeout ` +
						`(${DEFAULT_READ_TIMEOUT_MS} ms); lower UPSTREAM_TIMEOUT_MS`
				});
			}
			// NODE_ENV=test drops Secure and __Host- from the session cookies, accepts the published e2e
			// secret and serves the developer pages. It exists for a build run on this machine, so it
			// needs a localhost ORIGIN: a deployment cannot boot with the production checks off.
			if (v.NODE_ENV === 'test' && !isLocalOrigin(v.ORIGIN)) {
				ctx.addIssue({
					code: 'custom',
					path: ['NODE_ENV'],
					message:
						'NODE_ENV=test is for a server on this machine: ORIGIN must be set to a localhost origin (e.g. http://localhost:4173)'
				});
			}
			if (v.NODE_ENV !== 'production') return;
			if (!v.PUBLIC_SITE_URL) {
				ctx.addIssue({
					code: 'custom',
					path: ['PUBLIC_SITE_URL'],
					message:
						'PUBLIC_SITE_URL is required in production (a bare https origin, e.g. https://app.example.com)'
				});
			} else if (!v.PUBLIC_SITE_URL.startsWith('https://')) {
				ctx.addIssue({
					code: 'custom',
					path: ['PUBLIC_SITE_URL'],
					message: 'PUBLIC_SITE_URL must be https in production'
				});
			}
			if (v.ORIGIN && !v.ORIGIN.startsWith('https://')) {
				ctx.addIssue({
					code: 'custom',
					path: ['ORIGIN'],
					message: 'ORIGIN must be https in production'
				});
			}
			if (!v.ORIGIN && !(v.PROTOCOL_HEADER && v.HOST_HEADER)) {
				ctx.addIssue({
					code: 'custom',
					path: ['ORIGIN'],
					message:
						'production needs ORIGIN or both PROTOCOL_HEADER and HOST_HEADER — without one, ' +
						"SvelteKit's origin check rejects every form action (including sign-in) behind a TLS proxy"
				});
			}
			const secret = v.SCOPE_COOKIE_SECRET;
			if (secret && (secret.startsWith(E2E_SECRET_PREFIX) || secret === DEV_SCOPE_SECRET)) {
				ctx.addIssue({
					code: 'custom',
					path: ['SCOPE_COOKIE_SECRET'],
					message: 'SCOPE_COOKIE_SECRET is a published test/dev secret — generate a real one'
				});
			}
		})
		.transform((v) => ({ ...v, SCOPE_COOKIE_SECRET: v.SCOPE_COOKIE_SECRET ?? DEV_SCOPE_SECRET }));
}

/** Strict default: no dev fallback secret. */
export const configSchema = createConfigSchema({ allowDevSecret: false });

export type Config = z.infer<typeof configSchema>;

/**
 * During `npm run build`, SvelteKit imports server modules to compile
 * the route tree. Production env vars aren't available in that phase
 * (and shouldn't be — the build artifact is environment-agnostic).
 * `building === true` defers validation to runtime.
 *
 * Production-deploy contract: the BFF process must have its env set at
 * startup. `validateConfig()` runs from the server `init` hook (which Kit
 * does not run at build), so a bad environment fails boot loudly.
 */
function load(): Config {
	const parsed = createConfigSchema({ allowDevSecret: dev }).safeParse({
		GO_API_URL,
		// Schema default is 'production' (fail closed); under `vite dev` a fresh
		// clone without .env.local should still work.
		NODE_ENV: NODE_ENV || (dev ? 'development' : undefined),
		SCOPE_COOKIE_SECRET,
		ORIGIN,
		PUBLIC_SITE_URL,
		PROTOCOL_HEADER,
		HOST_HEADER,
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

/** Read the config once at server start (the `init` hook): throws on a bad environment. */
export function validateConfig(): void {
	get();
}

export const isProd = (): boolean => {
	if (building) return false;
	return get().NODE_ENV === 'production';
};
