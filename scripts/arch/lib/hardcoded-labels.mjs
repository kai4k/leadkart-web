/**
 * Hard-coded user-facing labels in the shared component layers.
 *
 * Under `src/lib/components/{ui,form,data,feedback}/**` an English literal in an `aria-label`,
 * `placeholder`, `title` or `alt` attribute, or as the text of a `sr-only` span, is a string that
 * bypasses i18n: the Hindi interface would read English to a screen reader. Those layers read
 * their default labels from the locale files (`$_('common.…')`, `$_('form.…')`) and let a caller
 * override them through a prop.
 *
 * Deliberately narrow (a literal attribute value, a literal sr-only text), so it has no noise;
 * `{expression}` values and interpolations are not judged here. A line, or the line above it,
 * carrying `i18n-allow` is skipped.
 */

export const LABEL_DIRS = ['ui', 'form', 'data', 'feedback'].map((d) => `src/lib/components/${d}/`);

/**
 * Folders and files with a recorded reason, kept out of the check:
 *  - `ui/data-table/`: the legacy table, deleted with its last user (plan L18).
 */
export const LABEL_ALLOWLIST = ['src/lib/components/ui/data-table/'];

const ATTRIBUTE = /(?<![\w:-])(aria-label|placeholder|title|alt|aria-description)="([^"]*)"/g;
const SR_ONLY_TEXT = /class="[^"]*\bsr-only\b[^"]*"[^>]*>([^<>{}]*)</g;

/** @param {string} text */
const hasWords = (text) => /[A-Za-z]{2}/.test(text.replace(/\{[^}]*\}/g, ''));

/**
 * @param {string} rel path relative to the repo root
 * @param {string} src file text
 * @returns {Array<{ line: number, text: string }>}
 */
export function findHardcodedLabels(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (!LABEL_DIRS.some((d) => norm.startsWith(d))) return [];
	if (LABEL_ALLOWLIST.some((d) => norm.startsWith(d))) return [];
	if (norm.endsWith('.stories.svelte')) return [];
	const lines = src.split('\n');
	/** @type {Array<{ line: number, text: string }>} */
	const found = [];
	/**
	 * @param {number} index
	 * @param {string} text
	 */
	const consider = (index, text) => {
		if (!hasWords(text)) return;
		const line = src.slice(0, index).split('\n').length;
		if (lines[line - 1]?.includes('i18n-allow') || lines[line - 2]?.includes('i18n-allow')) return;
		found.push({ line, text: text.trim().slice(0, 60) });
	};
	for (const m of src.matchAll(ATTRIBUTE)) consider(m.index, m[2]);
	for (const m of src.matchAll(SR_ONLY_TEXT)) consider(m.index, m[1]);
	return found.sort((a, b) => a.line - b.line);
}
