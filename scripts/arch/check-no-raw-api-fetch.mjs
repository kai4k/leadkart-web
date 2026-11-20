#!/usr/bin/env node
/**
 * No-raw-network gate (CLAUDE.md rule 6; replaces check-no-fetch-in-components).
 *
 * Every browser call to the BFF goes through the ONE client (`src/lib/api/client.ts`): it adds the
 * CSRF token and the tenant-context fingerprint the BFF requires on every call, maps errors and
 * follows session renewal. A hand-rolled call elsewhere silently loses the fingerprint and is
 * answered 409 `scope_changed` for every user. The rule is read from the SYNTAX TREE (TypeScript's
 * parser; `.svelte` files by their `<script>` blocks and their markup), not from text, so an alias
 * (`const f = fetch`), `window['fetch']`, `self.fetch`, a path built in another module, a relative
 * `api/v1/...`, and the other transports cannot slip past a pattern that looked for `fetch(`.
 *
 * Outside the pinned FILES below, in `src/**` (`.ts`, `.js`, `.mjs`, `.svelte`) it is a violation to:
 *   1. reference `fetch` at all: a call, a value, a destructured binding, `window.fetch`,
 *      `globalThis.fetch`, `self.fetch`, `x['fetch']` (a method named fetch on another object, such
 *      as `event.fetch` or `query.refetch`, is not the global);
 *   2. use `navigator.sendBeacon`, `XMLHttpRequest`, `EventSource` or `WebSocket`;
 *   3. write an `/api` path as a string, template or markup text: `'/api'`, `'/api/...'`, any
 *      `api/v1` (relative or built with `location.origin`), `<form action="/api/...">`,
 *      `<a href="/api/...">`, `<img src="/api/...">`.
 * Comments never count. The exceptions are exact files (never directories), each with its reason.
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
	'src/lib/features/auth/api.ts':
		'logout and confirm-email-change POST to the BFF /auth/* routes (not /api), the second with the load fetch of SvelteKit.',
	'src/routes/(auth)/confirm-email-change/+page.ts':
		'A universal load: receives the load fetch of SvelteKit itself and hands it to the gateway.'
};

const GLOBAL_RECEIVERS = new Set(['window', 'globalThis', 'self', 'top', 'parent', 'frames']);
const TRANSPORTS = new Set(['XMLHttpRequest', 'EventSource', 'WebSocket', 'sendBeacon']);

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
	if (file.endsWith('.ts')) return ts.ScriptKind.TS;
	return ts.ScriptKind.JS;
}

/** The violations (`{ line, what }`) in one piece of script. `line0` offsets a `<script>` block in a `.svelte` file. */
function scan(code, kind, line0 = 0) {
	const sf = ts.createSourceFile('x', code, ts.ScriptTarget.Latest, true, kind);
	const out = [];
	const add = (node, what) => {
		const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 + line0;
		out.push({ line, what });
	};
	const visit = (n) => {
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
			if (n.text === 'fetch' && !isMemberName) add(n, 'a reference to `fetch`');
			else if (n.text === 'fetch' && ts.isPropertyAccessExpression(parent) && parent.name === n) {
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
			if (key === 'fetch' || TRANSPORTS.has(key)) add(n, `\`['${key}']\``);
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

/** `<script>` blocks of a `.svelte` file as `{ code, line0 }`, and the markup with them blanked. */
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

/** Violations in one file's source: `{ line, what }[]`. Comments never count. */
export function findViolations(rel, src) {
	if (!rel.endsWith('.svelte')) return scan(src, scriptKindOf(rel));
	const { blocks, markup } = splitSvelte(src);
	const out = blocks.flatMap((b) => scan(b.code, ts.ScriptKind.TS, b.line0));
	// Markup: `<form action="/api/x">`, `<a href={`/api/${x}`}>`, `<img src="api/v1/x">`, `{fetch(...)}` blocks.
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
		// A markup expression block that reaches a transport.
		if (/\{[^}]*\bfetch\b[^}]*\}/.test(line))
			out.push({ line: i + 1, what: 'a `fetch` in a markup expression' });
	});
	return out;
}

export function isAllowed(rel) {
	return Object.hasOwn(ALLOWED_FILES, rel.replaceAll('\\', '/'));
}

function main() {
	const files = globSync('src/**/*.{ts,js,mjs,svelte}', {
		cwd: ROOT,
		exclude: ['src/lib/api/generated/**']
	}).map((f) => f.replaceAll('\\', '/'));
	const violations = [];
	for (const rel of files) {
		if (isAllowed(rel)) continue;
		for (const v of findViolations(rel, readFileSync(join(ROOT, rel), 'utf8'))) {
			violations.push(`${rel}:${v.line}  ${v.what}`);
		}
	}
	if (violations.length === 0) {
		console.log(
			`✓ check-no-raw-api-fetch: ${files.length} file(s), no direct fetch, other transport or /api path outside the ${Object.keys(ALLOWED_FILES).length} pinned file(s).`
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
