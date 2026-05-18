/**
 * SvelteKit route param matcher — restricts [id=uuid] segments to
 * RFC 4122 UUID v4 format only. Used to differentiate the UUID-keyed
 * /operator/tenants/[id=uuid] route from the slug-keyed
 * /operator/tenants/[slug] route.
 *
 * SvelteKit docs: https://kit.svelte.dev/docs/advanced-routing#matching
 */
export function match(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
