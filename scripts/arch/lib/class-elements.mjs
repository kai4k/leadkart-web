/**
 * The class lists of a .svelte file, read from the Svelte compiler's AST instead of from lines of text.
 *
 * Why: a line grep cannot tell one element from the next (two elements on a line), nor see a class list
 * that is split over several lines or built by `cn()`. The unit here is the ELEMENT (or component tag):
 * its class list is every string in its `class` attribute (text parts, every string literal and template
 * quasi inside a `{...}` expression, so a whole `cn('a', cond && 'b', { c: x })` call counts, base and
 * variants as one UNION) plus its `class:name` directives.
 *
 * What it still cannot see (it is a lint, the contrast gate is the proof for tokens): a class list that
 * reaches an element through a variable (`class={styles}` where `styles` is built elsewhere is read only as
 * a pseudo-element when the string is a literal in this file's <script>), a class passed to a child as a
 * prop and applied inside that child, and a `<svelte:element>` whose tag is dynamic is read like any other.
 */
import { parse } from 'svelte/compiler';

/** `a:b:[&_x:y]:util!` -> `{ variants: ['a','b','[&_x:y]'], base: 'util' }` (a `:` inside `[...]` / `(...)` does not split). */
export function splitToken(token) {
	const parts = [];
	let depth = 0;
	let from = 0;
	for (let i = 0; i < token.length; i++) {
		const c = token[i];
		if (c === '[' || c === '(') depth++;
		else if (c === ']' || c === ')') depth--;
		else if (c === ':' && depth === 0) {
			parts.push(token.slice(from, i));
			from = i + 1;
		}
	}
	let base = token.slice(from);
	base = base.replace(/^!/, '').replace(/!$/, '');
	base = base.replace(/\/[\w[\].%-]+$/, '');
	return { variants: parts, base, raw: token };
}

const tokensOf = (text) => text.split(/\s+/).filter(Boolean).map(splitToken);

const UTILITY_PREFIX =
	/^(?:[\w:[\]()&>*.=-]*:)?(?:bg|text|border|ring|ring-offset|outline|fill|stroke|caret|decoration|accent|shadow|from|via|to|divide|placeholder)(?:-[tblrxyse])?-$/;

/** Collects the strings of a JS expression: literals, template quasis; flags a built-up utility prefix. */
function collect(node, out, lineOf) {
	if (!node || typeof node !== 'object') return;
	if (Array.isArray(node)) {
		for (const n of node) collect(n, out, lineOf);
		return;
	}
	switch (node.type) {
		case 'Literal':
			if (typeof node.value === 'string') out.strings.push(node.value);
			return;
		case 'TemplateLiteral': {
			node.quasis.forEach((q, i) => {
				const text = q.value.cooked ?? q.value.raw;
				out.strings.push(text);
				if (i < node.quasis.length - 1) {
					const last = text.split(/\s+/).pop() ?? '';
					if (UTILITY_PREFIX.test(last))
						out.dynamic.push({ line: lineOf(node.start), name: `\`…${last}\${…}\`` });
				}
			});
			for (const e of node.expressions) collect(e, out, lineOf);
			return;
		}
		case 'BinaryExpression':
			if (
				node.operator === '+' &&
				node.left.type === 'Literal' &&
				typeof node.left.value === 'string' &&
				UTILITY_PREFIX.test(node.left.value.split(/\s+/).pop() ?? '')
			)
				out.dynamic.push({
					line: lineOf(node.start),
					name: `'${node.left.value.split(/\s+/).pop()}' + …`
				});
			collect(node.left, out, lineOf);
			collect(node.right, out, lineOf);
			return;
		default:
			for (const key of Object.keys(node)) {
				if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') continue;
				const v = node[key];
				if (v && typeof v === 'object') collect(v, out, lineOf);
			}
	}
}

/**
 * @typedef {{ variants: string[], base: string, raw: string }} Token
 * @typedef {{ line: number, tag: string, tokens: Token[], parent: number, dynamic: Array<{line: number, name: string}> }} El
 * @returns {{ elements: El[], scripts: Array<{ line: number, tokens: Token[] }>, styles: Array<{ line: number, css: string }>, dynamic: Array<{ line: number, name: string }>, usesMaterial: boolean, text: string } | null}
 *   `null` when the file does not parse (the gate reports that separately).
 */
export function classElements(src) {
	let ast;
	try {
		ast = parse(src, { modern: true });
	} catch {
		return null;
	}
	const lineOf = (offset) => src.slice(0, offset).split('\n').length;
	/** @type {El[]} */
	const elements = [];
	const scripts = [];
	const dynamic = [];

	function readClass(attr, out) {
		if (attr.type === 'ClassDirective') {
			out.strings.push(attr.name);
			return;
		}
		if (attr.type !== 'Attribute' || attr.name !== 'class' || attr.value === true) return;
		const parts = Array.isArray(attr.value) ? attr.value : [attr.value];
		for (const p of parts) {
			if (p.type === 'Text') out.strings.push(p.data);
			else if (p.type === 'ExpressionTag') collect(p.expression, out, lineOf);
		}
	}

	function walk(node, parent) {
		if (!node || typeof node !== 'object') return;
		if (Array.isArray(node)) {
			for (const n of node) walk(n, parent);
			return;
		}
		let me = parent;
		if (Array.isArray(node.attributes) && typeof node.name === 'string') {
			const out = { strings: [], dynamic: [] };
			for (const a of node.attributes) readClass(a, out);
			elements.push({
				line: lineOf(node.start),
				tag: node.name,
				tokens: out.strings.flatMap(tokensOf),
				parent,
				dynamic: out.dynamic
			});
			dynamic.push(...out.dynamic);
			me = elements.length - 1;
		}
		for (const key of Object.keys(node)) {
			if (key === 'attributes' || key === 'type' || key === 'start' || key === 'end') continue;
			const v = node[key];
			if (v && typeof v === 'object') walk(v, me);
		}
	}
	walk(ast.fragment, -1);

	// strings in <script> and <script module>: each is its own pseudo-element (a cva() variant map, a const list)
	for (const s of [ast.instance, ast.module]) {
		if (!s) continue;
		const out = { strings: [], dynamic: [] };
		collect(s.content, out, lineOf);
		for (const str of out.strings) {
			const tokens = tokensOf(str);
			if (tokens.length) scripts.push({ line: lineOf(s.start), tokens });
		}
		dynamic.push(...out.dynamic);
	}

	const styles = [];
	if (ast.css?.content)
		styles.push({ line: lineOf(ast.css.content.start), css: ast.css.content.styles });

	const usesMaterial = elements.some((e) =>
		e.tokens.some((t) => /^material-(?:bar|pane|sidebar|sidebar-bar)$/.test(t.base))
	);
	return { elements, scripts, styles, dynamic, usesMaterial, text: src };
}
