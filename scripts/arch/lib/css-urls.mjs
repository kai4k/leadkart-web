/**
 * Built CSS must reference assets by URL the browser can fetch. A `url(...)` that carries a
 * filesystem path (a drive letter, `/home/...` after `../`, a `file:` URL, `node_modules`) is a
 * build-machine path leaking into the output: the request aborts in every other place. `data:` and
 * `#fragment` URLs are fine.
 *
 * @param {string} css
 * @returns {string[]} the offending url() contents
 */
export function findFilesystemUrls(css) {
	const out = [];
	for (const m of css.matchAll(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/g)) {
		const url = m[2].trim();
		if (url.startsWith('data:') || url.startsWith('#')) continue;
		if (
			/^[a-zA-Z]:[/\\]/.test(url) ||
			/(^|\/)[a-zA-Z]:\//.test(url) ||
			/^file:/i.test(url) ||
			/(^|\/)node_modules\//.test(url) ||
			/^(\.\.\/)+(home|Users|usr|opt|var|mnt|tmp|runner|workspace|github)\//.test(url)
		)
			out.push(url);
	}
	return out;
}
