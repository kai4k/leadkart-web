/**
 * The caller's address, as the BFF tells Go. Go rate-limits login, refresh and password reset per
 * client address and takes that address from `X-Forwarded-For` ONLY when the direct peer is a
 * trusted proxy (this server). Without the header every user of the product would share the one
 * bucket of the BFF's own address.
 *
 * ONE place builds it, for every server-to-server call to Go (the proxy, `goFetch`, `goAuthFetch`
 * with the refresh and every form action behind it):
 *   - the value is `event.getClientAddress()` and nothing else: exactly one address, validated as
 *     an IP with `node:net` (no pattern). A header the browser sent (`x-forwarded-for`,
 *     `forwarded`, `x-real-ip`, ...) is never copied: every Go request starts from headers built
 *     here, and `stripForwarding` removes what a caller put into the ones it passed;
 *   - when the address cannot be read or is not one IP, NO header is sent (Go then falls back to the
 *     peer) and that is logged once at warn level, never per request;
 *   - what adapter-node makes of `getClientAddress()` is deployment configuration (ADDRESS_HEADER,
 *     XFF_DEPTH): see the README, "Client address".
 */
import { isIP } from 'node:net';
import { getRequestEvent } from '$app/server';

export const FORWARDED_FOR_HEADER = 'x-forwarded-for';

/** Headers that say where a request came from, or which command it is: only the BFF writes them. */
const CALLER_CONTROLLED = new Set([
	'x-forwarded-for',
	'x-forwarded-host',
	'x-forwarded-proto',
	'x-forwarded-port',
	'forwarded',
	'x-real-ip',
	'x-client-ip',
	'true-client-ip',
	'cf-connecting-ip',
	'x-command-id'
]);

let warned = false;
function warnOnce(why: string): void {
	if (warned) return;
	warned = true;
	console.warn(`[bff] no X-Forwarded-For sent to Go: ${why}`);
}

/** Test seam: the warning is once per process, a test needs it once per case. */
export function resetClientAddressWarning(): void {
	warned = false;
}

/** The single, valid address `read` returns, or undefined (logged once). */
export function validClientAddress(read: () => string): string | undefined {
	let value: unknown;
	try {
		value = read();
	} catch {
		warnOnce('the client address could not be read from the request');
		return undefined;
	}
	if (typeof value !== 'string' || isIP(value) === 0) {
		warnOnce('the client address is not a single IP address');
		return undefined;
	}
	return value;
}

/** Remove every caller-supplied forwarding / command header (any casing) from a plain header record. */
export function stripForwarding(headers: Record<string, string>): void {
	for (const name of Object.keys(headers)) {
		if (CALLER_CONTROLLED.has(name.toLowerCase())) delete headers[name];
	}
}

/** Set the one `x-forwarded-for` (never append) from the request's address; nothing when it is unusable. */
export function setClientAddress(headers: Headers, read: () => string): void {
	const address = validClientAddress(read);
	if (address !== undefined) headers.set(FORWARDED_FOR_HEADER, address);
}

/**
 * The same for code that has no `event` in hand (goFetch, goAuthFetch, the refresh): the address of
 * the request being served, from SvelteKit's request context. Outside a request (a script, a unit
 * test) there is none, and nothing is sent.
 */
export function currentClientAddress(): string | undefined {
	let event: ReturnType<typeof getRequestEvent>;
	try {
		event = getRequestEvent();
	} catch {
		return undefined;
	}
	return validClientAddress(() => event.getClientAddress());
}
