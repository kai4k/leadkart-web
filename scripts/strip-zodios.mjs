/**
 * Post-process the openapi-zod-client output:
 *   - Strip the @zodios/core scaffolding (we use TanStack Query, not Zodios).
 *   - Patch Zod 4 incompatibilities the generator still emits:
 *       z.record(V) → z.record(z.string(), V)  (Zod 4 requires the key type).
 *
 * The raw output is:
 *   line 1:  import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
 *   line 2:  import { z } from "zod";
 *   ...
 *   const LoginRequest = z.object({...}).passthrough();
 *   ...
 *   const endpoints = makeApi([...]);
 *   export const api = new Zodios(endpoints);
 *   export function createApiClient(baseUrl, options) { ... }
 *
 * We slice off line 1 (Zodios import) and everything from
 * `const endpoints = makeApi([` onward, keeping the z import + the
 * schema constants + the exported `schemas` map.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { argv } from 'node:process';

const path = argv[2];
if (!path) {
	console.error('Usage: node scripts/strip-zodios.mjs <generated-file>');
	process.exit(1);
}

let raw = readFileSync(path, 'utf8');

const ZODIOS_IMPORT = 'import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";\n';
if (!raw.startsWith(ZODIOS_IMPORT)) {
	console.error(`Expected first line to be Zodios import in ${path}`);
	process.exit(1);
}
raw = raw.slice(ZODIOS_IMPORT.length);

const endpointsStart = raw.indexOf('\nconst endpoints = makeApi([');
if (endpointsStart === -1) {
	console.error('Expected `const endpoints = makeApi([` block — output shape changed?');
	process.exit(1);
}
let body = raw.slice(0, endpointsStart).trim();

// Export every `const Foo = z....` so feature modules can re-import the
// schemas by name. The bottom-of-file `export const schemas = { ... }`
// already exists; this lets `import { TenantDto } from '$api/generated/openapi-zod'`
// work alongside the bag-style `import { schemas }`.
body = body.replace(/(^|\n)const ([A-Z][A-Za-z0-9]*) = /g, '$1export const $2 = ');

// Zod 4 compat: z.record(V) → z.record(z.string(), V)
body = body.replace(/z\.record\(((?:[^()]|\([^)]*\))*?)\)/g, (match, inner) => {
	let depth = 0;
	for (let i = 0; i < inner.length; i++) {
		const c = inner[i];
		if (c === '(' || c === '[' || c === '{') depth++;
		else if (c === ')' || c === ']' || c === '}') depth--;
		else if (c === ',' && depth === 0) return match;
	}
	return `z.record(z.string(), ${inner})`;
});

const cleaned = `/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Zod schemas mirroring leadkart-go/api/openapi.yaml.
 * Source-of-record per backend ADR 0050. Regenerate with \`npm run openapi:codegen\`.
 * The @zodios/core scaffolding has been stripped by scripts/strip-zodios.mjs —
 * we use TanStack Query, not Zodios.
 */
${body}
`;

writeFileSync(path, cleaned, 'utf8');
console.log(`[strip-zodios] cleaned ${path}`);
