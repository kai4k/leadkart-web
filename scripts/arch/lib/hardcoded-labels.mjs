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

export const LABEL_DIRS = [
	...['ui', 'form', 'data', 'feedback'].map((d) => `src/lib/components/${d}/`),
	'src/lib/layouts/'
];

/**
 * Flip to true in the commit that rebuilds the last user of the legacy table (plan Task 23,
 * DataTable). The allowlist entry below then FAILS the gate until the entry (and the folder) are
 * removed, so the exemption cannot outlive its reason.
 */
export const LEGACY_DATA_TABLE_REBUILT = false;

/**
 * Folders and files with a recorded reason, kept out of the check. Each has an owner (the task
 * that makes it unnecessary) and an end (`checkLabelAllowlist`).
 *  - `ui/data-table/`: the legacy table, removed in Task 23 when DataTable is rebuilt (plan L18).
 */
export const LABEL_ALLOWLIST_ENTRIES = [
	{
		path: 'src/lib/components/ui/data-table/',
		owner: 'Task 23',
		rebuilt: () => LEGACY_DATA_TABLE_REBUILT
	}
];
export const LABEL_ALLOWLIST = LABEL_ALLOWLIST_ENTRIES.map((e) => e.path);

/**
 * Problems with the allowlist itself: an entry whose folder is gone, or whose owner task has landed.
 * @param {(path: string) => boolean} exists
 * @param {boolean} [rebuilt] overrides the marker (tests)
 * @returns {string[]}
 */
export function checkLabelAllowlist(exists, rebuilt) {
	const problems = [];
	for (const e of LABEL_ALLOWLIST_ENTRIES) {
		if (!exists(e.path))
			problems.push(
				`label allowlist: ${e.path} no longer exists; remove the entry (owner ${e.owner})`
			);
		else if (rebuilt ?? e.rebuilt())
			problems.push(
				`label allowlist: ${e.path} is marked rebuilt; delete it and the entry (owner ${e.owner})`
			);
	}
	return problems;
}

const FORMAT_STRING = /^(?:[DMYHhmsdyAa]{1,4}(?:[\s/.:-]+|$))+$/;

/**
 * A non-linguistic format string ("DD/MM/YYYY", "HH:mm"): only date/time pattern letters and
 * separators. It is a pattern, not a sentence, so it needs no translation key.
 * @param {string} text
 */
export function isFormatString(text) {
	const t = text.trim();
	// a lone word made of pattern letters ("Date", "Day") is not enough: it needs a separator or a repeated letter
	return t.length <= 24 && FORMAT_STRING.test(t) && /(.)\1|[/.:-]/.test(t);
}

const ATTRIBUTE = /(?<![\w:-])(aria-label|placeholder|title|alt|aria-description)="([^"]*)"/g;
const SR_ONLY_TEXT = /class="[^"]*\bsr-only\b[^"]*"[^>]*>([^<>{}]*)</g;

/** @param {string} text */
const hasWords = (text) =>
	/[A-Za-z]{2}/.test(text.replace(/\{[^}]*\}/g, '')) && !isFormatString(text);

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
