/**
 * Static files the offline shell never needs: link-preview images, Windows tiles and the 512 px icons
 * (about 400 kB). They are fetched from the network on demand and are not part of the precache list.
 * Pinned by name; the precache LIST is the only thing this changes (no fetch handler, cache name or
 * private-cache rule depends on it).
 */
const NOT_PRECACHED = [
	/(?:^|\/)og-image-[\w-]*\.png$/,
	/(?:^|\/)mstile-[\w-]*\.png$/,
	/(?:^|\/)android-chrome-512x512\.png$/,
	/(?:^|\/)maskable-512x512\.png$/
];

export function isPrecached(path: string): boolean {
	return !NOT_PRECACHED.some((re) => re.test(path));
}
