/**
 * Validated server-side runtime configuration.
 *
 * One module owns env-var ingestion. Every server-side import touches
 * `config.X` here instead of reaching into `$env/dynamic/private` directly.
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
 * The module is server-only (`$lib/server/*` is unreachable from
 * client bundles per SvelteKit's static analysis). Never import this
 * from a `.svelte` file or anything that ends up in the client graph.
 */

import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import { z } from 'zod';

const schema = z.object({
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
	 * Defaults to 'development' so missing env vars degrade safely (Node
	 * itself often sets this automatically; dev/test stays HTTP).
	 */
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

export type Config = z.infer<typeof schema>;

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
	const parsed = schema.safeParse({
		GO_API_URL: env.GO_API_URL,
		NODE_ENV: env.NODE_ENV
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
					`If you need a value at build time, use $env/static/private instead.`
			);
		}
		return get()[key as keyof Config];
	}
});

export const isProd = (): boolean => {
	if (building) return false;
	return get().NODE_ENV === 'production';
};
