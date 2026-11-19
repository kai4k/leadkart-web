/**
 * Regenerates src/lib/api/generated/* from the Go OpenAPI spec (the source of truth),
 * reproducibly: the spec is read from a PINNED commit of the Go repo, recorded in
 * src/lib/api/generated/SOURCE.json, never from the Go working tree.
 *
 *   npm run openapi:codegen              regenerate from the pinned commit
 *   npm run openapi:codegen -- --update  re-pin to the Go repo's current HEAD commit, regenerate
 *   npm run openapi:check                regenerate from the pinned commit, fail if the working
 *                                        tree under generated/ changed (incl. untracked files)
 *
 * Go repo: $LEADKART_GO_DIR, default ../leadkart-go. In --check mode a missing Go checkout is a
 * skip (exit 0 with a notice; CI wiring is a later task); a missing pinned commit fails.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const OUT = 'src/lib/api/generated';
const SOURCE_FILE = `${OUT}/SOURCE.json`;
const SPEC_PATH_IN_REPO = 'api/openapi.yaml';
const goDir = resolve(process.env.LEADKART_GO_DIR ?? '../leadkart-go');
const args = new Set(process.argv.slice(2));
const update = args.has('--update');
const check = args.has('--check');
const require = createRequire(import.meta.url);

function fail(message) {
	console.error(`[openapi] ${message}`);
	process.exit(1);
}

/** Runs a command with an args array (no shell, so paths with spaces/metacharacters are safe). */
function run(cmd, cmdArgs, opts = {}) {
	const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', shell: false, ...opts });
	if (r.error) fail(`${cmd} failed to start: ${r.error.message}`);
	return r;
}
const git = (...gitArgs) => run('git', ['-C', goDir, ...gitArgs]);

/** Runs a dependency's CLI through node directly (npx/.cmd shims need a shell on Windows). */
function runPackageBin(pkg, binArgs) {
	const manifestPath = require.resolve(`${pkg}/package.json`);
	const { bin } = JSON.parse(readFileSync(manifestPath, 'utf8'));
	const rel = typeof bin === 'string' ? bin : (bin[pkg] ?? Object.values(bin)[0]);
	const r = run(process.execPath, [join(dirname(manifestPath), rel), ...binArgs], {
		stdio: 'inherit',
		encoding: undefined
	});
	if (r.status !== 0) fail(`${pkg} exited with ${r.status}`);
}

if (!existsSync(join(goDir, '.git'))) {
	if (check) {
		console.log(`openapi:check skipped — leadkart-go checkout not found at ${goDir}`);
		process.exit(0);
	}
	fail(`leadkart-go checkout not found at ${goDir}; set LEADKART_GO_DIR`);
}

let source;
if (update) {
	const commit = git('rev-parse', 'HEAD');
	if (commit.status !== 0) fail(`cannot read HEAD of ${goDir}: ${commit.stderr.trim()}`);
	const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
	source = {
		repo: 'leadkart-go',
		commit: commit.stdout.trim(),
		branch: branch.stdout.trim(),
		spec: SPEC_PATH_IN_REPO
	};
} else {
	if (!existsSync(SOURCE_FILE)) fail(`${SOURCE_FILE} not found; run with --update to pin a commit`);
	source = JSON.parse(readFileSync(SOURCE_FILE, 'utf8'));
}

const show = git('show', `${source.commit}:${source.spec}`);
if (show.status !== 0) {
	fail(
		`cannot read ${source.spec} at commit ${source.commit} in ${goDir} (${show.stderr.trim()}). ` +
			`Fetch that commit or re-pin with: npm run openapi:codegen -- --update`
	);
}

const tmp = mkdtempSync(join(tmpdir(), 'lk-openapi-'));
try {
	const spec = join(tmp, 'openapi.yaml');
	writeFileSync(spec, show.stdout);
	runPackageBin('openapi-typescript', [spec, '-o', `${OUT}/openapi-types.ts`]);
	runPackageBin('openapi-zod-client', [spec, '-o', `${OUT}/openapi-zod.ts`, '--export-schemas']);
} finally {
	rmSync(tmp, { recursive: true, force: true });
}
const strip = run(process.execPath, ['scripts/strip-zodios.mjs', `${OUT}/openapi-zod.ts`], {
	stdio: 'inherit',
	encoding: undefined
});
if (strip.status !== 0) fail('strip-zodios failed');

// Deterministic: no timestamps.
writeFileSync(SOURCE_FILE, `${JSON.stringify(source, null, '\t')}\n`);
runPackageBin('prettier', ['--write', OUT]);
console.log(
	`[openapi] generated from ${source.repo}@${source.commit.slice(0, 12)} (${source.branch})`
);

if (check) {
	const status = run('git', ['status', '--porcelain', '--', OUT]);
	if (status.status !== 0) fail(`git status failed: ${status.stderr.trim()}`);
	if (status.stdout.trim() !== '') {
		console.error(status.stdout);
		fail(
			`${OUT} is out of date with ${source.commit.slice(0, 12)}. ` +
				`Run: npm run openapi:codegen, review and commit the result.`
		);
	}
	console.log('[openapi] openapi:check passed');
}
