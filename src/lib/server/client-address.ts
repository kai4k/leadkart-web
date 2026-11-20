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
 *   - when the address cannot be read or is not one IP (a zone id such as `fe80::1%eth0` counts: Go
 *     then ignores the whole header), NO header is sent (Go falls back to the peer) and that is
 *     logged at warn level at most once per five minutes with a count of the rest; an IPv4-mapped
 *     IPv6 address is sent as the plain IPv4 (Go unmaps it too);
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

/**
 * One warning per kind at most every five minutes, with a count of what was suppressed since: a
 * misconfiguration (a missing ADDRESS_HEADER, a wrong XFF_DEPTH) is persistent, so a single line at
 * start-up scrolls away while every user shares one rate-limit bucket; a line per request would
 * drown the log. The count says the problem is still happening.
 */
const WARN_EVERY_MS = 5 * 60_000;
const warnings = new Map<string, { at: number; suppressed: number }>();
function warnLimited(kind: string, message: string): void {
	const now = Date.now();
	const last = warnings.get(kind);
	if (last && now - last.at < WARN_EVERY_MS) {
		last.suppressed++;
		return;
	}
	const suppressed = last?.suppressed ?? 0;
	warnings.set(kind, { at: now, suppressed: 0 });
	console.warn(
		`[bff] ${message}${suppressed > 0 ? ` (${suppressed} more since the last warning)` : ''}`
	);
}
const warnNoHeader = (why: string) =>
	warnLimited('no-header', `no X-Forwarded-For sent to Go: ${why}`);

/** Test seam: the warnings are rate limited per process, a test needs them fresh per case. */
export function resetClientAddressWarning(): void {
	warnings.clear();
}

/**
 * A request that arrived with `X-Forwarded-For` while ADDRESS_HEADER is not set: the BFF is probably
 * behind a proxy and is reporting the proxy's own address for every user (one shared rate-limit
 * bucket: anyone can lock everyone out of login). Said once per five minutes with a count.
 */
export function noteForwardedWithoutAddressHeader(request: Request | undefined): void {
	if (!request?.headers.has(FORWARDED_FOR_HEADER)) return;
	// ADDRESS_HEADER belongs to adapter-node (not to `config`): a runtime read of the process
	// environment, on the server only, is exactly what is wanted here.
	// eslint-disable-next-line no-restricted-globals
	if ((process.env.ADDRESS_HEADER ?? '') !== '') return;
	warnLimited(
		'proxy-without-address-header',
		'a request carries X-Forwarded-For but ADDRESS_HEADER is not set: the BFF is probably behind a proxy and is reporting the proxy address for every user (set ADDRESS_HEADER=x-forwarded-for and XFF_DEPTH)'
	);
}

/** The longest text form of an IP address (a full IPv6 with an embedded IPv4): bounds everything below. */
const MAX_IP_TEXT = 45;

/**
 * `::ffff:a.b.c.d` in any spelling (dotted, hex, long form) as the plain IPv4 `a.b.c.d`; anything
 * else unchanged. Go unmaps these too, and rate-limits the address it ends up with.
 */
function unmapIPv4(value: string): string {
	if (isIP(value) !== 6) return value;
	let host: string;
	try {
		host = new URL(`http://[${value}]/`).hostname; // the canonical form: `[::ffff:c000:204]`
	} catch {
		return value;
	}
	const hextets = host.slice(1, -1).split(':'); // `::ffff:c000:204` -> ['', '', 'ffff', 'c000', '204']
	if (hextets.length !== 5 || hextets[0] !== '' || hextets[1] !== '' || hextets[2] !== 'ffff') {
		return value;
	}
	const high = Number.parseInt(hextets[3] ?? '', 16);
	const low = Number.parseInt(hextets[4] ?? '', 16);
	return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

/** The single, valid address `read` returns, or undefined (logged, rate limited). */
export function validClientAddress(read: () => string): string | undefined {
	let value: unknown;
	try {
		value = read();
	} catch {
		warnNoHeader('the client address could not be read from the request');
		return undefined;
	}
	if (typeof value !== 'string' || value.length > MAX_IP_TEXT || isIP(value) === 0) {
		warnNoHeader('the client address is not a single IP address');
		return undefined;
	}
	// `isIP` accepts a zone id (`fe80::1%eth0`); Go rejects it and then ignores the WHOLE header.
	if (value.includes('%')) {
		warnNoHeader('the client address has a zone id (Go would ignore the whole header)');
		return undefined;
	}
	return unmapIPv4(value);
}

/** Remove every caller-supplied forwarding / command header (any casing) from a plain header record. */
export function stripForwarding(headers: Record<string, string>): void {
	for (const name of Object.keys(headers)) {
		if (CALLER_CONTROLLED.has(name.toLowerCase())) delete headers[name];
	}
}

/** Set the one `x-forwarded-for` (never append) from the request's address; nothing when it is unusable. */
export function setClientAddress(headers: Headers, read: () => string, request?: Request): void {
	noteForwardedWithoutAddressHeader(request);
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
	noteForwardedWithoutAddressHeader(event.request);
	return validClientAddress(() => event.getClientAddress());
}
