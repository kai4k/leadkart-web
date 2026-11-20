#!/usr/bin/env node
/**
 * No-raw-network gate (CLAUDE.md rule 6; replaces check-no-fetch-in-components).
 *
 * THIS GATE IS A TRIPWIRE, NOT A BOUNDARY. It catches the honest mistake and the lazy shortcut; a
 * determined author can always write a call that tree-reading cannot name (a key built at run time,
 * a function reached through another object). The BOUNDARY is the BFF: the proxy refuses any call
 * without the CSRF token and the current context fingerprint (403 / 409 `scope_changed`), and
 * sessions, scope and permissions are enforced there and in Go, never in the browser.
 *
 * Every browser call to the BFF goes through the ONE client (`src/lib/api/client.ts`): it adds the
 * CSRF token and the tenant-context fingerprint the BFF requires on every call, maps errors and
 * follows session renewal. A hand-rolled call elsewhere silently loses the fingerprint and is
 * answered 409 `scope_changed` for every user. The rule is read from the SYNTAX TREE (TypeScript's
 * parser; `.svelte` files by their `<script>` blocks and by every `{ ... }` expression of their
 * markup, multi-line blocks and event handlers included), not from text, so an alias
 * (`const f = fetch`), `window['fetch']`, `self.fetch`, a path built in another module, a relative
 * `api/v1/...`, and the other transports cannot slip past a pattern that looked for `fetch(`.
 *
 * Scanned: `src/**` (`.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`, `.svelte`) and the script files
 * under `static/`. Outside the pinned FILES below it is a violation to:
 *   1. reference `fetch` at all: a call, a value, a destructured binding, `window.fetch`,
 *      `globalThis.fetch`, `self.fetch`, `x['fetch']` (a method named fetch on another object, such
 *      as `event.fetch` or `query.refetch`, is not the global);
 *   2. use `navigator.sendBeacon`, `XMLHttpRequest`, `EventSource` or `WebSocket`;
 *   3. write an `/api` path as a string, template or markup text: `'/api'`, `'/api/...'`, any
 *      `api/v1` (relative or built with `location.origin`), `<form action="/api/...">`,
 *      `<a href="/api/...">`, `<img src="/api/...">`;
 *   4. name `'fetch'` or a transport as a string key: `{ 'fetch': f }`, `Reflect.get(window, 'fetch')`.
 * Everywhere in `src/` (the pinned files included) it is a violation to import an HTTP client
 * library: `axios`, `ky`, `ofetch`, `got`, `undici`, `node-fetch`, `cross-fetch`.
 * Comments never count. The exceptions are exact files (never directories), each with its reason;
 * a URL-only file may call `fetch` / `fetchFn` ONLY with one of its exact literal URLs.
 *
 * Exit code: 0 on clean, 1 on any violation.
 */
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Exact files that may use the network transports directly, each with the reason. */
export const ALLOWED_FILES = {
	'src/lib/api/client.ts':
		'THE client: the only browser caller of /api (CSRF token, context fingerprint, errors).',
	'src/service-worker/index.ts':
		'The platform fetch layer: names /api only to NOT intercept it (its test pins that); forwards requests the browser made.',
	'src/routes/api/[...path]/+server.ts': 'The BFF proxy: its fetch goes to the Go API.',
	'src/lib/server/go.ts':
		'goFetch: the server-to-server call to Go (the one transport of every action and load).',
	'src/lib/server/auth-refresh.ts': 'The silent refresh: a server-to-server call to Go.',
	'src/lib/server/proxy.ts':
		'The proxy helpers: the upstream URL, and the upstream fetch with its timeout.',
	'src/routes/(auth)/confirm-email-change/+page.ts':
		'A universal load: receives the load fetch of SvelteKit itself and hands it to the gateway.'
};

/**
 * Files that may call the network ONLY with an exact literal URL from their list: a `fetch` /
 * `fetchFn` call with any other first argument, or any other use of `fetch` (an alias, a value),
 * is a violation. `typeof fetch` and the `fetchFn = fetch` parameter default are the only other
 * shapes allowed.
 */
export const URL_ONLY_FILES = {
	'src/lib/features/auth/api.ts': {
		urls: ['/auth/logout', '/auth/confirm-email-change'],
		reason:
			'logout and confirm-email-change POST to the BFF /auth/* routes (not /api), the second with the load fetch of SvelteKit.'
	}
};

/** HTTP client libraries: another way to reach the network, refused anywhere in src/. */
const HTTP_LIBRARIES = new Set([
	'axios',
	'ky',
	'ofetch',
	'got',
	'undici',
	'node-fetch',
	'cross-fetch'
]);
const isHttpLibrary = (spec) => HTTP_LIBRARIES.has(spec.split('/')[0].replace(/^node:/, ''));

const GLOBAL_RECEIVERS = new Set(['window', 'globalThis', 'self', 'top', 'parent', 'frames']);
const TRANSPORTS = new Set(['XMLHttpRequest', 'EventSource', 'WebSocket', 'sendBeacon']);
const isNetworkName = (text) => text === 'fetch' || TRANSPORTS.has(text);

/** True for a string that names the BFF API: `/api`, `/api/...`, or any `api/v1`. */
function namesApi(text) {
	return (
		text === '/api' ||
		text.startsWith('/api/') ||
		text.startsWith('/api?') ||
		text.includes('api/v1')
	);
}

function scriptKindOf(file) {
	if (/\.[mc]?ts$/.test(file)) return ts.ScriptKind.TS;
	return ts.ScriptKind.JS;
}

/**
 * The violations (`{ line, what }`) in one piece of script. `line0` offsets a `<script>` block in a
 * `.svelte` file. `urlOnly` ({ urls }) holds the file to its exact literal URLs.
 */
function scan(code, kind, line0 = 0, urlOnly = undefined) {
	const sf = ts.createSourceFile('x', code, ts.ScriptTarget.Latest, true, kind);
	const out = [];
	const add = (node, what) => {
		const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 + line0;
		out.push({ line, what });
	};
	const firstUrl = (call) =>
		call.arguments[0] && ts.isStringLiteralLike(call.arguments[0]) ? call.arguments[0].text : null;
	/** In a URL-only file: is this `fetch` reference one of the permitted shapes? */
	const permittedFetch = (n) => {
		const parent = n.parent;
		if (ts.isCallExpression(parent) && parent.expression === n) {
			return urlOnly.urls.includes(firstUrl(parent));
		}
		if (ts.isTypeQueryNode(parent)) return true; // `typeof fetch`
		return (
			ts.isParameter(parent) &&
			parent.initializer === n &&
			ts.isIdentifier(parent.name) &&
			parent.name.text === 'fetchFn'
		);
	};
	const visit = (n) => {
		if (urlOnly && ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
			if (n.expression.text === 'fetchFn' && !urlOnly.urls.includes(firstUrl(n))) {
				add(n, `\`fetchFn\` called with a URL that is not one of ${urlOnly.urls.join(', ')}`);
			}
		}
		if (
			(ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
			n.moduleSpecifier &&
			ts.isStringLiteralLike(n.moduleSpecifier) &&
			isHttpLibrary(n.moduleSpecifier.text)
		) {
			add(n, `an import of the HTTP client library \`${n.moduleSpecifier.text}\``);
		}
		if (
			ts.isCallExpression(n) &&
			n.arguments[0] &&
			ts.isStringLiteralLike(n.arguments[0]) &&
			isHttpLibrary(n.arguments[0].text) &&
			(n.expression.kind === ts.SyntaxKind.ImportKeyword ||
				(ts.isIdentifier(n.expression) && n.expression.text === 'require'))
		) {
			add(n, `a load of the HTTP client library \`${n.arguments[0].text}\``);
		}
		if (
			ts.isCallExpression(n) &&
			ts.isPropertyAccessExpression(n.expression) &&
			ts.isIdentifier(n.expression.expression) &&
			['Reflect', 'Object'].includes(n.expression.expression.text)
		) {
			for (const a of n.arguments) {
				if (ts.isStringLiteralLike(a) && isNetworkName(a.text)) {
					add(
						a,
						`\`${n.expression.expression.text}.${n.expression.name.text}\` naming '${a.text}'`
					);
				}
			}
		}
		if (
			(ts.isPropertyAssignment(n) || ts.isMethodDeclaration(n) || ts.isPropertyDeclaration(n)) &&
			n.name &&
			ts.isStringLiteralLike(n.name) &&
			isNetworkName(n.name.text)
		) {
			add(n.name, `'${n.name.text}' as a property key`);
		}
		if (ts.isIdentifier(n)) {
			const parent = n.parent;
			const isMemberName =
				(ts.isPropertyAccessExpression(parent) && parent.name === n) ||
				(ts.isPropertyAssignment(parent) && parent.name === n) ||
				(ts.isMethodDeclaration(parent) && parent.name === n) ||
				(ts.isPropertySignature(parent) && parent.name === n) ||
				(ts.isBindingElement(parent) && parent.propertyName === n) ||
				ts.isTypeReferenceNode(parent) ||
				ts.isImportSpecifier(parent) ||
				ts.isExportSpecifier(parent);
			if (n.text === 'fetch' && !isMemberName) {
				if (!(urlOnly && permittedFetch(n))) add(n, 'a reference to `fetch`');
			} else if (n.text === 'fetch' && ts.isPropertyAccessExpression(parent) && parent.name === n) {
				const recv = parent.expression;
				if (ts.isIdentifier(recv) && GLOBAL_RECEIVERS.has(recv.text))
					add(n, `\`${recv.text}.fetch\``);
			} else if (
				TRANSPORTS.has(n.text) &&
				!(ts.isPropertyAssignment(parent) && parent.name === n)
			) {
				add(n, `\`${n.text}\` (another network transport)`);
			}
		} else if (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression)) {
			const key = n.argumentExpression.text;
			if (isNetworkName(key)) add(n, `\`['${key}']\``);
		} else if (
			ts.isStringLiteralLike(n) ||
			ts.isTemplateHead(n) ||
			ts.isTemplateMiddle(n) ||
			ts.isTemplateTail(n)
		) {
			if (namesApi(n.text)) add(n, `an /api path written as a string (\`${n.text.slice(0, 24)}\`)`);
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
	return out;
}

/** `<script>` blocks of a `.svelte` / `.html` file as `{ code, line0 }`, and the markup with them blanked. */
function splitSvelte(src) {
	const blocks = [];
	let markup = '';
	let at = 0;
	for (;;) {
		const open = src.indexOf('<script', at);
		if (open === -1) break;
		const bodyStart = src.indexOf('>', open) + 1;
		const close = src.indexOf('</script>', bodyStart);
		if (bodyStart === 0 || close === -1) break;
		markup += src.slice(at, open);
		const code = src.slice(bodyStart, close);
		blocks.push({ code, line0: src.slice(0, bodyStart).split('\n').length - 1 });
		markup += src.slice(open, close + 9).replace(/[^\n]/g, ' ');
		at = close + 9;
	}
	markup += src.slice(at);
	return { blocks, markup };
}

/**
 * Every `{ ... }` expression of a markup (text, attributes, blocks, handlers, multi-line ones) as
 * `{ code, line0 }`. Brace matching skips quoted strings; `<style>` is blanked first. A block's
 * keyword (`#await`, `:else if`, `@const`, `@html`) is dropped so what remains parses as code.
 */
function markupExpressions(markup) {
	const text = markup.replace(/<style[\s\S]*?<\/style>/g, (m) => m.replace(/[^\n]/g, ' '));
	const out = [];
	for (let i = 0; i < text.length; i++) {
		if (text[i] !== '{') continue;
		let depth = 0;
		let quote = null;
		let j = i;
		for (; j < text.length; j++) {
			const c = text[j];
			if (quote) {
				if (c === '\\') j++;
				else if (c === quote) quote = null;
				continue;
			}
			if (c === "'" || c === '"' || c === '`') quote = c;
			else if (c === '{') depth++;
			else if (c === '}' && --depth === 0) break;
		}
		const inner = text.slice(i + 1, j).replace(/^\s*[#:@/][a-z]+(?: if)?\s*/, '');
		out.push({ code: `(${inner});`, line0: text.slice(0, i).split('\n').length - 1 });
		// Nested braces are inside this block's text: scanning it covers them.
		i = j;
	}
	return out;
}

/** Violations in one file's source: `{ line, what }[]`. Comments never count. */
export function findViolations(rel, src) {
	const key = rel.replaceAll('\\', '/');
	const urlOnly = Object.hasOwn(URL_ONLY_FILES, key) ? URL_ONLY_FILES[key] : undefined;
	if (!rel.endsWith('.svelte') && !rel.endsWith('.html')) {
		return scan(src, scriptKindOf(rel), 0, urlOnly);
	}
	const { blocks, markup } = splitSvelte(src);
	const out = blocks.flatMap((b) => scan(b.code, ts.ScriptKind.TS, b.line0));
	// Markup: `<form action="/api/x">`, `<a href={`/api/${x}`}>`, `<img src="api/v1/x">`.
	const noHtmlComments = markup.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
	noHtmlComments.split('\n').forEach((line, i) => {
		if (
			line.includes('/api/') ||
			line.includes('"/api"') ||
			line.includes("'/api'") ||
			line.includes('api/v1')
		) {
			out.push({ line: i + 1, what: 'an /api path in markup (href / action / src / expression)' });
		}
	});
	// Every markup expression is code: `{#await fetch(url)}`, `onclick={() => navigator.sendBeacon(u)}`,
	// a block spread over several lines.
	for (const e of markupExpressions(noHtmlComments)) {
		for (const v of scan(e.code, ts.ScriptKind.TS, e.line0)) {
			if (!out.some((o) => o.line === v.line && o.what === v.what)) out.push(v);
		}
	}
	return out;
}

export function isAllowed(rel) {
	return Object.hasOwn(ALLOWED_FILES, rel.replaceAll('\\', '/'));
}

function main() {
	const files = [
		...globSync('src/**/*.{ts,mts,cts,js,mjs,cjs,svelte}', {
			cwd: ROOT,
			exclude: ['src/lib/api/generated/**']
		}),
		...globSync('static/**/*.{js,mjs,cjs,ts,mts,cts,html}', { cwd: ROOT })
	].map((f) => f.replaceAll('\\', '/'));
	const violations = [];
	for (const rel of files) {
		const found = findViolations(rel, readFileSync(join(ROOT, rel), 'utf8'));
		// A pinned file may use the network; it may not import an HTTP client library.
		const kept = isAllowed(rel)
			? found.filter((v) => v.what.includes('HTTP client library'))
			: found;
		for (const v of kept) violations.push(`${rel}:${v.line}  ${v.what}`);
	}
	if (violations.length === 0) {
		console.log(
			`✓ check-no-raw-api-fetch: ${files.length} file(s), no direct fetch, other transport or /api path outside the ${Object.keys(ALLOWED_FILES).length} pinned file(s) (+${Object.keys(URL_ONLY_FILES).length} URL-only). A tripwire, not a boundary: the BFF refuses calls without the fingerprint and CSRF token.`
		);
		process.exit(0);
	}
	console.error(`✗ check-no-raw-api-fetch: ${violations.length} violation(s):\n`);
	for (const v of violations) console.error(`  ${v}`);
	console.error(
		'\nFix: go through `api.get / post / postJson / postForm / getBlob` in src/lib/api/client.ts (it adds the CSRF token and the context fingerprint the BFF requires), via a feature gateway (src/lib/features/<name>/api.ts).'
	);
	process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
