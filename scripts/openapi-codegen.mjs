/**
 * Regenerates src/lib/api/generated/* from the Go OpenAPI spec (the source of truth).
 * Spec path: $LEADKART_OPENAPI_SPEC, default ../leadkart-go/api/openapi.yaml.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const spec = resolve(process.env.LEADKART_OPENAPI_SPEC ?? '../leadkart-go/api/openapi.yaml');
if (!existsSync(spec)) {
	console.error(`[openapi] spec not found at ${spec}; set LEADKART_OPENAPI_SPEC`);
	process.exit(1);
}
const OUT = 'src/lib/api/generated';
const run = (cmd, args) =>
	execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });

run('npx', ['openapi-typescript', spec, '-o', `${OUT}/openapi-types.ts`]);
run('npx', ['openapi-zod-client', spec, '-o', `${OUT}/openapi-zod.ts`, '--export-schemas']);
run('node', ['scripts/strip-zodios.mjs', `${OUT}/openapi-zod.ts`]);
run('npx', ['prettier', '--write', OUT]);
