#!/usr/bin/env node
/**
 * Codemod for the Task 5 primitive API renames (plan L19). `node scripts/codemods/ui-api-renames.mjs [--dry]`
 *
 *   Button / Dropdown.Trigger   variant="primary" -> default, "danger" -> destructive, "glass" -> outline
 *                               size="md" -> (dropped: it is the default)
 *                               fullWidth -> class="w-full"
 *   Badge                       appearance=* and size=* dropped; appearance="outline" -> variant="outline"
 *   Alert                       variant="danger" -> variant="destructive"
 *   `Pagination` imported from `$ui` -> `#lib/components/data/Pagination.svelte`
 *
 * Prints every file changed, then the dynamic spellings it could not map (`variant={x ? 'danger' : 'ghost'}`),
 * with file:line, for a hand edit. Idempotent.
 */
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const BUTTON_VARIANT = { primary: 'default', danger: 'destructive', glass: 'outline' };

/** [start, end) of each opening tag of `name` (handles `{...}` and quotes inside attributes). */
function openingTags(src, name) {
	const out = [];
	const re = new RegExp(`<${name.replace('.', '\\.')}(?=[\\s>/])`, 'g');
	for (const m of src.matchAll(re)) {
		let i = m.index + m[0].length;
		let depth = 0;
		let quote = null;
		for (; i < src.length; i++) {
			const c = src[i];
			if (quote) {
				if (c === quote) quote = null;
			} else if (depth > 0) {
				if (c === '{') depth++;
				else if (c === '}') depth--;
				else if (c === '"' || c === "'" || c === '`') quote = c;
			} else if (c === '{') depth++;
			else if (c === '"' || c === "'") quote = c;
			else if (c === '>') break;
		}
		out.push([m.index, i + 1]);
	}
	return out;
}

function lineOf(src, index) {
	return src.slice(0, index).split('\n').length;
}

/** Rewrites the opening tags of `name` with `fn(tagText) => tagText`, back to front so offsets hold. */
function mapTags(src, name, fn) {
	let out = src;
	for (const [start, end] of openingTags(src, name).reverse())
		out = out.slice(0, start) + fn(out.slice(start, end), start) + out.slice(end);
	return out;
}

const dropAttr = (tag, attr) =>
	tag.replace(new RegExp(`\\s${attr}(?:=(?:"[^"]*"|'[^']*'|\\{[^}]*\\}))?(?=[\\s/>])`), '');

function addClass(tag, cls) {
	const quoted = /\sclass="([^"]*)"/.exec(tag);
	if (quoted)
		return tag.replace(
			quoted[0],
			` class="${quoted[1] ? `${quoted[1]} ` : ''}${cls}"`.replace(/ +"/, '"')
		);
	const dynamic = /\sclass=\{([^}]*)\}/.exec(tag);
	if (dynamic) return tag.replace(dynamic[0], ` class={['${cls}', ${dynamic[1]}]}`);
	return tag.replace(/^(<[\w.]+)/, `$1 class="${cls}"`);
}

/** @returns {{ out: string, unmapped: Array<{ line: number, what: string }> }} */
export function renameSource(src) {
	const unmapped = [];
	let out = src;

	for (const name of ['Button', 'Dropdown.Trigger']) {
		out = mapTags(out, name, (tag, start) => {
			let t = tag;
			t = t.replace(
				/\svariant="(primary|danger|glass)"/,
				(_m, v) => ` variant="${BUTTON_VARIANT[v]}"`
			);
			t = t.replace(/\ssize="md"/, '');
			if (/\sfullWidth(?=[\s/>])/.test(t) && !/\sfullWidth=/.test(t)) {
				t = dropAttr(t, 'fullWidth');
				t = addClass(t, 'w-full');
			} else if (/\sfullWidth=/.test(t)) {
				unmapped.push({ line: lineOf(out, start), what: 'fullWidth={…}' });
			}
			const dyn = /\svariant=\{([^}]*)\}/.exec(t);
			if (dyn && /primary|danger|glass/.test(dyn[1]))
				unmapped.push({ line: lineOf(out, start), what: `variant={${dyn[1]}}` });
			if (/\ssize=\{[^}]*\bmd\b/.test(t))
				unmapped.push({ line: lineOf(out, start), what: 'size={… md …}' });
			return t;
		});
	}

	out = mapTags(out, 'Badge', (tag, start) => {
		let t = tag;
		// outline of a NEUTRAL (or unspecified) badge becomes variant="outline"; a status or dynamic
		// variant keeps its colour (the outline appearance is gone; the soft fill replaces it)
		if (
			/\sappearance="outline"/.test(t) &&
			(!/\svariant=/.test(t) || /\svariant="neutral"/.test(t))
		) {
			t = dropAttr(t, 'variant');
			t = t.replace(/\sappearance="outline"/, ' variant="outline"');
		}
		t = dropAttr(t, 'appearance');
		t = dropAttr(t, 'size');
		if (/\sappearance=/.test(tag) && !/\sappearance="/.test(tag))
			unmapped.push({ line: lineOf(out, start), what: 'appearance={…}' });
		return t;
	});

	out = mapTags(out, 'Alert', (tag, start) => {
		const t = tag.replace(/\svariant="danger"/, ' variant="destructive"');
		const dyn = /\svariant=\{([^}]*)\}/.exec(t);
		if (dyn && /danger/.test(dyn[1]))
			unmapped.push({ line: lineOf(out, start), what: `variant={${dyn[1]}}` });
		return t;
	});

	// `Pagination` from `$ui` -> the data composite
	out = out.replace(/import\s*\{([^}]*)\}\s*from\s*'\$ui';/g, (m, names) => {
		const list = names
			.split(',')
			.map((x) => x.trim())
			.filter(Boolean);
		if (!list.includes('Pagination')) return m;
		const rest = list.filter((x) => x !== 'Pagination');
		const keep = rest.length ? `import { ${rest.join(', ')} } from '$ui';\n` : '';
		return `${keep}import Pagination from '#lib/components/data/Pagination.svelte';`;
	});

	return { out, unmapped };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const dry = process.argv.includes('--dry');
	const files = globSync('src/**/*.svelte', { cwd: ROOT }).filter(
		(f) => !/^src\/lib\/components\/ui\/(button|badge|alert)\//.test(f.replaceAll('\\', '/'))
	);
	let changed = 0;
	const unmappedAll = [];
	for (const rel of files) {
		const path = join(ROOT, rel);
		const before = readFileSync(path, 'utf8');
		const { out, unmapped } = renameSource(before);
		for (const u of unmapped) unmappedAll.push(`${rel.replaceAll('\\', '/')}:${u.line}  ${u.what}`);
		if (out !== before) {
			changed++;
			console.log(`${dry ? 'would change' : 'changed'}: ${rel.replaceAll('\\', '/')}`);
			if (!dry) writeFileSync(path, out);
		}
	}
	console.log(`\n${changed} file(s) ${dry ? 'would change' : 'changed'}.`);
	if (unmappedAll.length) {
		console.log(`\nUnmapped (edit by hand):`);
		for (const u of unmappedAll) console.log(`  ${u}`);
	}
}
