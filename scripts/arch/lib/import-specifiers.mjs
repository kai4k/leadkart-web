/**
 * Module specifiers a source file imports, read from the import syntax (not from any text that
 * merely mentions a package): `import x from 'm'`, `import { a } from 'm'`, `import type … from 'm'`,
 * `export … from 'm'`, `import 'm'` and `import('m')`. Comments are dropped first, and an import
 * only counts at the start of a statement, so a fixture inside a string or a template literal does
 * not.
 *
 * @param {string} src a `.ts`, `.js` or `.svelte` file
 * @returns {Array<{ line: number, specifier: string }>}
 */
export function importSpecifiers(src) {
	// Block and HTML comments become same-length blanks (keeps line numbers); whole-line `//`
	// comments too. A trailing `// …` after code is kept: it cannot hide an import statement.
	/** @param {string} m */
	const blank = (m) => m.replace(/[^\n]/g, ' ');
	const text = src
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/^[ \t]*\/\/.*$/gm, blank);
	const found = [];
	const patterns = [
		/(?:^|[>\s;{}])(?:import|export)\s[^'"`;]*?\bfrom\s*['"]([^'"\n]+)['"]/gm,
		/(?:^|[>\s;{}])import\s*['"]([^'"\n]+)['"]/gm,
		/(?:^|[^\w$.])import\s*\(\s*['"`]([^'"`$\n]+)['"`]\s*\)/gm
	];
	for (const re of patterns)
		for (const m of text.matchAll(re)) {
			const at = m.index + m[0].lastIndexOf(m[1]);
			found.push({ line: text.slice(0, at).split('\n').length, specifier: m[1] });
		}
	return found.sort((a, b) => a.line - b.line);
}

/**
 * True when `specifier` is `pkg` or a subpath of it (`bits-ui`, `bits-ui/internal`).
 * @param {string} specifier
 * @param {string} pkg
 */
export function isPackage(specifier, pkg) {
	return specifier === pkg || specifier.startsWith(`${pkg}/`);
}
