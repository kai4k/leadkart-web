# Phase 1a: SvelteKit 3 migration + dependency hygiene. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to work through this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move leadkart-web from SvelteKit 2 to SvelteKit 3.3 and drop deprecated or unused packages. App behaviour must not change, and every gate must stay green.

**Architecture:** This is a mechanical migration driven by the official guide (https://svelte.dev/docs/kit/migrating-to-sveltekit-3) and the `npx sv migrate sveltekit-3` codemod. `svelte-check` drives the manual fixes. Custom `$` aliases (`$ui`, `$features`, `$api`, `$icons`, `$form`, `$layouts`) stay for now: Kit 3 deprecates them but has not removed them. Only `$lib` changes, to `#lib`.

**Tech stack:** @sveltejs/kit 3.3.0, adapter-node 6.0.4, svelte 5.57.3, vite 8.3.8, vite-plugin-svelte 7.3.1, TypeScript 6.x (**not** 7: Kit 3 peers on `typescript ^6.0.0`), Node ≥22.17.

**Spec:** `docs/superpowers/specs/2026-11-18-platform-upgrade-ui-foundation-design.md` §4.1.

## Global constraints

- **Pin exact versions.** `.npmrc` has `prefer-offline=true`, which makes `@latest` resolve stale metadata. Never `npm i pkg@latest`.
- Install with `npm i --prefer-online <pkg>@<exact>`.
- **The local npm cache is stale.** Even with `--prefer-online` it reports old versions (for example `@lucide/svelte` 1.17.0 when the live registry has 1.74.0). Run every npm install, uninstall and ci command with a fresh cache, set per shell: `export npm_config_cache="C:/Users/anrgc/AppData/Local/Temp/claude/a847394163f802b5/88a4fd59-6778-430f-b631-5a7a2ab05de6/scratchpad/npmcache"` (in PowerShell: `$env:npm_config_cache = '…'`). Check it first: `npm view @lucide/svelte version` must print `1.74.0`. Never clean the user's real cache.
- Branch `feat/kit3-hardening` lives in the main repo. **No worktrees.**
- Run commands from `D:\Development\leadkart-web` with an **uppercase drive letter**. Vitest loads two module instances if the cwd is `d:` (all suites then fail with `Cannot read properties of undefined (reading 'config')`). PowerShell's default cwd is fine; in Git Bash, `cd /D/Development/leadkart-web` does not fix it, so run vitest from PowerShell.
- The gate set after every task is `npm run check`, `npm run lint`, `npm run test`, `npm run arch:check`, `npm run lint:deps`, `npm run build`. All must pass before a commit. Exception: Task 3 is allowed red until Step 6.
- Commit messages are conventional and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Bump to latest Kit 2 + dependency hygiene

**Files:**

- Modify: `package.json`, `package-lock.json`
- Modify: `src/lib/icons/index.ts`, `src/lib/icons/Icon.svelte`, `src/lib/utils/routeTitle.ts`, `eslint.config.js` (lucide rename)
- Modify: `.storybook/main.ts` (drop addon-essentials)
- Modify: `knip.config.ts` (drop adapter-auto from `ignoreDependencies`)

**Interfaces:** Produces the same `$icons` exports as before, now sourced from `@lucide/svelte`.

- [ ] **Step 1: Bump the Kit 2 toolchain to the versions Kit 3 requires**

```bash
npm i -D --prefer-online @sveltejs/kit@2.70.4 svelte@5.57.3 svelte-check@4.7.8 eslint-plugin-svelte@3.24.1 @sveltejs/vite-plugin-svelte@7.3.1 vite@8.3.8
```

- [ ] **Step 2: Remove unused and mismatched packages**

```bash
npm uninstall @sveltejs/adapter-auto @storybook/addon-essentials
```

In `.storybook/main.ts`, change the addons line:

```ts
	addons: ['@storybook/addon-a11y', '@storybook/addon-svelte-csf'],
```

In `knip.config.ts`, delete the line `'@sveltejs/adapter-auto',` from `ignoreDependencies`.

- [ ] **Step 3: Move runtime packages into `dependencies`**

`npm audit --omit=dev` cannot see packages that live in devDependencies, and adapter-node runs these at runtime:

```bash
npm uninstall -D @sveltejs/kit svelte
npm i --prefer-online @sveltejs/kit@2.70.4 svelte@5.57.3
```

Expected: `package.json` `dependencies` now lists `@sveltejs/kit` and `svelte`.

- [ ] **Step 4: Rename lucide-svelte to @lucide/svelte**

`lucide-svelte` is deprecated on npm ("Please use @lucide/svelte instead").

```bash
npm uninstall lucide-svelte
npm i --prefer-online @lucide/svelte@1.74.0
```

In `src/lib/icons/index.ts`, `src/lib/icons/Icon.svelte`, `src/lib/utils/routeTitle.ts` and `eslint.config.js`, replace every `'lucide-svelte'` with `'@lucide/svelte'`, including in comments.

```bash
grep -rln "lucide-svelte" src eslint.config.js .storybook scripts | xargs sed -i "s#lucide-svelte#@lucide/svelte#g"
grep -rn "lucide-svelte" src eslint.config.js .storybook scripts
```

Expected: the second grep prints nothing.

- [ ] **Step 5: Run the gates**

```bash
npm run check && npm run lint && npm run arch:check && npm run lint:deps && npm run build
```

Then run `npm run test` from PowerShell at `D:\Development\leadkart-web`.

Expected: everything passes, and 508 tests pass. If `npm run check` reports icon type errors (an icon name missing in `@lucide/svelte` 1.x), rename that icon in `src/lib/icons/index.ts` to the name in https://lucide.dev/icons, keeping the exported alias unchanged.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(deps): latest Kit 2, @lucide/svelte, drop adapter-auto + addon-essentials, runtime deps to dependencies"
```

---

### Task 2: Kit 3 core upgrade, codemod, config move

**Files:**

- Modify: `package.json` (kit 3.3.0, adapter-node 6.0.4, superforms 3.1.0, formsnap 2.1.0, `engines.node`)
- Modify: `vite.config.ts` (absorbs `svelte.config.js`)
- Delete: `svelte.config.js`
- Modify: `eslint.config.js` (drop the `svelteConfig` import)
- Modify: `tsconfig.json`

**Interfaces:** Produces `vite.config.ts` as the single SvelteKit config.

- [ ] **Step 1: Collect the Kit 2 deprecation warnings before upgrading**

```bash
npm run build 2>&1 | grep -iE "deprecat|warn" > C:/Users/anrgc/AppData/Local/Temp/claude/a847394163f802b5/88a4fd59-6778-430f-b631-5a7a2ab05de6/scratchpad/kit2-deprecations.txt; cat C:/Users/anrgc/AppData/Local/Temp/claude/a847394163f802b5/88a4fd59-6778-430f-b631-5a7a2ab05de6/scratchpad/kit2-deprecations.txt
```

Keep this list. Every entry must be resolved by the end of Task 4.

- [ ] **Step 2: Install Kit 3 and its peers**

```bash
npm i --prefer-online @sveltejs/kit@3.3.0 sveltekit-superforms@3.1.0 formsnap@2.1.0
npm i -D --prefer-online @sveltejs/adapter-node@6.0.4
```

In `package.json`, set `"engines": { "node": ">=22.17.0" }`.

- [ ] **Step 3: Run the official codemod**

```bash
npx sv migrate sveltekit-3
git status --short | wc -l
git diff --stat | tail -1
```

Read the codemod output, then review the diff by category: config, `$lib`, `goto`, env, types. Don't commit yet.

- [ ] **Step 4: Move the config into `vite.config.ts`** (only if the codemod didn't)

`vite.config.ts` should end up with this plugin call. Keep everything else in the file, including `build.rollupOptions.output.manualChunks` and its comment block:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter({ out: 'build', precompress: true }),
			alias: {
				$features: 'src/lib/features',
				$layouts: 'src/lib/layouts',
				$ui: 'src/lib/components/ui',
				$form: 'src/lib/components/form',
				$icons: 'src/lib/icons',
				$api: 'src/lib/api'
			}
		})
	]
	// … server + build blocks unchanged
});
```

Move the adapter-node rationale comment from `svelte.config.js` (the BFF / precompress paragraph) onto the `sveltekit({...})` call. Then:

```bash
git rm svelte.config.js
```

- [ ] **Step 5: Fix `eslint.config.js`**

Delete `import svelteConfig from './svelte.config.js';` (line 8) and remove `svelteConfig,` from `parserOptions` (around line 291). eslint-plugin-svelte 3.24 reads the Kit 3 config from `vite.config.ts` itself. In the named-config ignore list (around line 398), drop `'svelte.config.js',`.

- [ ] **Step 6: Fix `tsconfig.json`**

```json
{
	"extends": "$app/tsconfig",
	"compilerOptions": {
		"allowJs": true,
		"checkJs": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true,
		"moduleResolution": "bundler"
	},
	"include": [
		"src/**/*.ts",
		"src/**/*.js",
		"src/**/*.svelte",
		"tests/**/*.ts",
		"vite.config.ts",
		"vitest.config.ts",
		"playwright.config.ts"
	],
	"exclude": [
		"**/*.stories.ts",
		"**/*.stories.svelte",
		".storybook/**",
		"storybook-static/**",
		"src/service-worker/**",
		"node_modules/**",
		"build/**"
	]
}
```

If the guide's `$app/tsconfig` export path differs (check `node_modules/@sveltejs/kit/package.json` `exports`), use the documented path. Don't guess.

- [ ] **Step 7: Sync and get the error count**

```bash
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json --output machine 2>&1 | tail -3
```

Note the error count. Task 3 works it down to zero. Don't commit until Task 3 Step 6 passes; Tasks 2 and 3 land as one commit.

---

### Task 3: `$lib` → `#lib`, `resolve()`, `goto`, env and type moves

**Files:** about 251 files (`$lib` imports) plus about 43 (`resolve`) plus about 18 (`goto`). The codemod handles most of them; this task finishes the rest.

**Rules:**

| Kit 2                                                              | Kit 3                                                                                                                                              |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import x from '$lib/foo'`                                         | `import x from '#lib/foo.js'` (always add an extension: `.js` for `.ts` sources, `.svelte` for components, `.svelte.js` for `.svelte.ts`)          |
| `resolve('/dashboard')` with a route id                            | unchanged, if `/dashboard` is a route id (has `+page`/`+server`)                                                                                   |
| `resolve('/leads/' + id)` / ``resolve(`/leads/${id}`)`` (pathname) | ``resolve(`leads/${id}`)`` (no leading `/`) **or** a route id with params: `resolve('/(app)/leads/[id]', { id })` (prefer this, it's type-checked) |
| `Pathname`, `Asset`, `ResolvedPathname` types                      | `Path`, `AssetPath`; for `ResolvedPathname`, use the type named in the guide (search `node_modules/@sveltejs/kit/types/index.d.ts` for `Resolved`) |
| `goto(u, { replaceState: true })`                                  | `goto(u, { replace: true })`                                                                                                                       |
| `goto(u, { keepFocus: true, noScroll: true })`                     | `goto(u, { reset: false })`                                                                                                                        |
| `goto(u, { keepFocus: true })` only                                | `goto(u, { reset: false })`, **and** confirm keeping scroll is acceptable (true for URL-filter/tab/pagination hooks)                               |
| `invalidateAll()`                                                  | `refreshAll()` from `$app/navigation`                                                                                                              |
| `$app/environment`                                                 | `$app/env`                                                                                                                                         |
| `$env/dynamic/private`                                             | `$app/env/private`                                                                                                                                 |
| `$env/dynamic/public` / `$env/static/public`                       | `$app/env/public`                                                                                                                                  |
| `import type { Cookies, RequestEvent } from '@sveltejs/kit'`       | `from '$app/server'`                                                                                                                               |
| `HandleClientError` etc. from `@sveltejs/kit`                      | `from '@sveltejs/kit/hooks'`                                                                                                                       |
| `json(body, init)` from `@sveltejs/kit`                            | `Response.json(body, init)`                                                                                                                        |

- [ ] **Step 1: Finish the `$lib` → `#lib` move**

```bash
grep -rlE "['\"]\\\$lib(/|['\"])" src tests | wc -l
```

For each remaining file, rewrite `'$lib/x/y'` to `'#lib/x/y.<ext>'`, with the extension resolved against the real file on disk. `src/app.d.ts` and `src/hooks.client.ts` are included. Expected: the grep count reaches 0.

- [ ] **Step 2: Fix `resolve()` call sites**

```bash
grep -rn "resolve(" src --include=*.svelte --include=*.ts | grep -v "Promise\|new Promise\|path.resolve" > C:/Users/anrgc/AppData/Local/Temp/claude/a847394163f802b5/88a4fd59-6778-430f-b631-5a7a2ab05de6/scratchpad/resolve-sites.txt; wc -l C:/Users/anrgc/AppData/Local/Temp/claude/a847394163f802b5/88a4fd59-6778-430f-b631-5a7a2ab05de6/scratchpad/resolve-sites.txt
```

Go through all 57 sites and apply the rule table. Template-literal paths (15 sites, e.g. ``resolve(`/leads/${id}`)``) become route-id form: `resolve('/(app)/leads/[id]', { id })`. If `svelte-check` reports that route ids must not include the group segment, drop `(app)/`. Follow whichever form `svelte-check` accepts and apply it consistently.

- [ ] **Step 3: Fix `goto` options and `invalidateAll`**

```bash
grep -rnE "replaceState:|keepFocus:|noScroll:|invalidateAll" src
```

Apply the table. Expected after the edits: the grep prints nothing.

- [ ] **Step 4: Fix env and type imports**

```bash
grep -rnE "\\\$app/environment|\\\$env/|from '@sveltejs/kit'" src | grep -E "Cookies|RequestEvent|HandleClientError|environment|\\\$env|json"
```

Apply the table:

- `src/lib/server/config.ts`: `import { env } from '$app/env/private'` and `import { building } from '$app/env'`.
- `src/lib/hooks/use-pwa.svelte.ts`: `$app/env`.
- The 6 `json()` sites → `Response.json()`.

- [ ] **Step 5: Run svelte-check until clean**

```bash
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json --output human 2>&1 | tail -20
```

Fix each reported error with the rule table. Expected: `0 errors 0 warnings`.

- [ ] **Step 6: Commit Tasks 2 and 3 together**

```bash
npm run lint && npm run build
git add -A
git commit -m "feat(kit3): migrate to SvelteKit 3.3 — config in vite.config, #lib imports, resolve/goto/env/type moves"
```

Lint failures from the `#lib` imports are fixed in Task 5. If lint blocks the commit through the husky hook, finish Task 5 Steps 1–3 first and commit everything together.

---

### Task 4: Lock in the Kit 3 error and service-worker semantics with tests

> Re-planned after Tasks 2 and 3. The `handleError` rewrite (kind-based `ClientCaughtError` input), the move from `$service-worker` to `src/service-worker/index.ts`, and the service-worker type-check gate all landed in 69a7bfd plus its fix commit, because Kit 3 wouldn't compile without them. This task adds the missing regression tests and verifies the built worker.

**Files:**

- Test: `tests/unit/hooks/handle-error.test.ts` (create)
- Test: `tests/unit/service-worker/precache.test.ts` (create; build-output check)

**Interfaces:**

- Consumes: `handleError` from `src/hooks.client.ts`. Its type is `HandleClientError` from `@sveltejs/kit/hooks`, with input `ClientCaughtError & { event }`, where `kind` is `'app' | 'framework' | 'unknown'`.

- [ ] **Step 1: Write the handleError tests**

```ts
// tests/unit/hooks/handle-error.test.ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/i18n/index.ts', () => ({ initI18n: () => {} }));

const { handleError } = await import('../../../src/hooks.client');

const event = { url: new URL('http://x/leads/1') } as never;

describe('handleError (Kit 3 kind-based)', () => {
	it('keeps app errors (error(404, "Person not found")) on Kit defaults', () => {
		const out = handleError({
			kind: 'app',
			error: { status: 404, body: { message: 'Person not found' } },
			event
		} as never);
		expect(out).toBeUndefined();
	});

	it('maps a framework 404 (route miss) to generic copy', () => {
		const out = handleError({
			kind: 'framework',
			error: { status: 404, message: 'Not Found' },
			event
		} as never);
		expect(out).toEqual({ message: 'Page not found' });
	});

	it('keeps a framework non-404 4xx message', () => {
		const out = handleError({
			kind: 'framework',
			error: { status: 405, message: 'Method Not Allowed' },
			event
		} as never);
		expect(out).toEqual({ message: 'Method Not Allowed' });
	});

	it('hides unknown error detail behind 5xx copy', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const out = handleError({ kind: 'unknown', error: new Error('db down'), event } as never);
		expect(out).toEqual({ message: 'Something went wrong on our end. Please try again.' });
		spy.mockRestore();
	});
});
```

Before writing this, compare the `error` object shapes for each `kind` against `node_modules/@sveltejs/kit/types/index.d.ts` (`CaughtError`, around line 1280). If a field name differs (for example `body` versus `message`), use the real shape and drop the `as never` cast where the types allow it.

- [ ] **Step 2: Run the tests**

From PowerShell at `D:\`, run `npx vitest run tests/unit/hooks/handle-error.test.ts`.

Expected: 4 pass. The behaviour already exists, so these lock it in. **Prove each test can fail:** temporarily change `if (kind === 'app') return;` to `return {message:'x'}`, confirm the first test fails, then revert.

- [ ] **Step 3: Write the service-worker precache test (checks the build output)**

```ts
// tests/unit/service-worker/precache.test.ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sw = resolve(__dirname, '../../../build/client/service-worker.js');

describe.skipIf(!existsSync(sw))('built service worker', () => {
	it('precaches immutable app chunks', () => {
		const src = readFileSync(sw, 'utf8');
		expect(src).toMatch(/_app\/immutable\//);
	});
	it('does not reference the removed $service-worker module', () => {
		expect(readFileSync(sw, 'utf8')).not.toContain('$service-worker');
	});
});
```

- [ ] **Step 4: Build, then run the test**

```bash
npm run build
```

Then, from PowerShell, run `npx vitest run tests/unit/service-worker/precache.test.ts`.

Expected: 2 pass (they skip only when no build exists).

- [ ] **Step 5: Commit**

```bash
git add tests/unit/hooks tests/unit/service-worker
git commit -m "test(kit3): lock kind-based handleError + built service-worker precache"
```

---

### Task 5: Tooling (vitest, depcruise, knip, arch scripts, components.json, ESLint rules)

**Files:**

- Modify: `vitest.config.ts`, `tests/unit/stubs/` (add `app-env.ts`, `app-manifest.ts`)
- Modify: `.dependency-cruiser.cjs`, `knip.config.ts`, `components.json`, `eslint.config.js` (restricted-import patterns), `scripts/arch/*.mjs` (any `$lib` literal)
- Modify: `package.json` scripts (`check` stays `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`)

- [ ] **Step 1: Vitest resolves `#lib` and the new virtual modules**

Node resolves `#lib` natively from the `imports` field in `package.json` that the codemod added. Check that it's there:

```bash
node -e "console.log(require('./package.json').imports)"
```

Expected: `{ '#lib': './src/lib/index.js', '#lib/*': './src/lib/*' }` or the guide's equivalent. If it's missing, add exactly what the guide documents.

In `vitest.config.ts`:

- Delete the `$lib` / `$lib/*` alias lines. Keep the custom `$` aliases.
- Add the stubs:

```ts
			'$app/env': resolve(__dirname, 'tests/unit/stubs/app-env.ts'),
			'$app/env/private': resolve(__dirname, 'tests/unit/stubs/app-env.ts'),
			'$app/env/public': resolve(__dirname, 'tests/unit/stubs/app-env.ts'),
			'$app/server': resolve(__dirname, 'tests/unit/stubs/app-server.ts'),
```

Create `tests/unit/stubs/app-env.ts`:

```ts
export const browser = false;
export const dev = true;
export const building = false;
export const version = 'test';
export const env: Record<string, string | undefined> = {
	GO_API_URL: 'http://go.test',
	NODE_ENV: 'test'
};
```

Create `tests/unit/stubs/app-server.ts`:

```ts
export type { Cookies, RequestEvent } from '@sveltejs/kit';
export {};
```

If `@sveltejs/kit` no longer exports those types at the root in Kit 3, re-export them from the path the Kit 3 `.d.ts` declares.

Run (PowerShell, `D:\`): `npm run test`. Expected: all tests pass (508 plus the 3 new ones).

- [ ] **Step 2: ESLint restricted-import patterns**

```bash
grep -n "\\\$lib\|\\\$app/stores\|\\\$app/environment\|lucide" eslint.config.js
```

Update every pattern that mentions `$lib/...` to also match `#lib/...`, using a regex group (`(\\$|#)lib`) or a duplicated entry. Add `'$app/environment'` and `'$service-worker'` to `no-restricted-imports` with the message `"Removed in SvelteKit 3 — use $app/env / $app/manifest"`. Run `npm run lint`: expected clean.

- [ ] **Step 3: dependency-cruiser and knip**

```bash
npm run lint:deps
npm run lint:dead
```

If depcruise reports `#lib/...` as `not-to-unresolvable`, add `enhancedResolveOptions: { conditionNames: ['import', 'svelte', 'default'], exportsFields: ['exports'], importsFields: ['imports'] }` to `options` in `.dependency-cruiser.cjs`. If knip flags `#lib` imports as unresolved, add `paths: { '#lib/*': ['src/lib/*'] }` to `knip.config.ts`. Update `scripts/arch/*.mjs` regexes that match `'$lib/` to accept `'#lib/` as well:

```bash
grep -ln "\\\$lib" scripts/arch/*.mjs
```

Expected: `lint:deps` reports no violations. `arch:check` reports 16/16 passing.

- [ ] **Step 4: Update `components.json` for the shadcn CLI**

```json
	"aliases": {
		"components": "#lib/components",
		"utils": "#lib/utils/cn",
		"ui": "#lib/components/ui",
		"hooks": "#lib/hooks",
		"lib": "#lib"
	},
```

Check it with a dry run, which must not write files:

```bash
npx --prefer-online shadcn-svelte@1.8.1 add badge --dry-run 2>&1 | tail -5 || true
```

If the CLI rejects `#` aliases, revert `components.json` to `$lib` and note it in the commit body. The CLI only reads aliases when it generates code, which happens in Phase 2.

- [ ] **Step 5: Full gate run, e2e, Storybook smoke test**

```bash
npm run verify
npm run build
npm run test:e2e -- --project=chromium
npx storybook build --quiet && ls storybook-static/index.html
```

Run `npm run test` from PowerShell at `D:\`.

Expected: `verify` is green, the build is green, chromium e2e is green, and Storybook builds. If Storybook fails on Kit 3, don't block the phase: capture the error and open a GitHub issue on the repo with the error text (owner approval is needed before posting). Record it in the commit body.

- [ ] **Step 6: Update the bundle baseline**

```bash
npx size-limit
node scripts/check-bundle-size.mjs
```

If the critical-path budget fails only because of adapter-node 6's rolldown chunking, keep `manualChunks` as is and record the new numbers in the commit body. The size budget is informational under D3 (desktop-first).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(kit3): tooling — vitest stubs, eslint/depcruise/knip #lib resolution, components.json, arch scripts"
```

---

### Task 6: Verify the Kit 2 deprecation list is empty

- [ ] **Step 1:** Re-run `npm run build 2>&1 | grep -iE "deprecat|warn"` and compare against `C:/Users/anrgc/AppData/Local/Temp/claude/a847394163f802b5/88a4fd59-6778-430f-b631-5a7a2ab05de6/scratchpad/kit2-deprecations.txt` from Task 2 Step 1.

Expected: no Kit deprecation warnings remain. The custom `kit.alias` deprecation warning is the one **allowed** exception, and it's tracked for Phase 2.

- [ ] **Step 2:** Run `npm run preview` with the mock Go API (`npm run test:mock-server` in another shell, `GO_API_URL=http://localhost:<mock port>`). Sign in, open dashboard, leads, an operator scope page and settings/roles/[id]. Confirm there are no console errors except the known Tooltip-provider crash on roles/[id], which Phase 1b fixes.

- [ ] **Step 3: Commit** any leftover fixes:

```bash
git commit -am "fix(kit3): clear remaining deprecations"
```

Skip this if nothing changed.
