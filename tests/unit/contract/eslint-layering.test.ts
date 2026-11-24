/**
 * The two ESLint layering rules fire. A `no-restricted-imports` pattern that starts with `#` is a gitignore COMMENT and
 * matches nothing (both rules were dead that way once the imports moved to `#lib`), so each rule has a probe file that
 * must be flagged, and a legal operator sub-barrel import that must not be.
 */
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

/** Lints `code` AS IF it were an existing component file (the type-aware parser only knows files on disk). */
const HOST = 'src/lib/components/ui/overlay-name.ts';

async function messages(_label: string, code: string) {
	const [result] = await eslint.lintText(code, { filePath: HOST });
	const parseErrors = result!.messages.filter((m) => m.ruleId === null);
	expect(parseErrors, 'the probe must parse, or "no finding" proves nothing').toEqual([]);
	return result!.messages.filter((m) => m.ruleId === 'no-restricted-imports');
}

describe('no-restricted-imports layering patterns', () => {
	it('a component importing the API client directly is flagged', async () => {
		const found = await messages(
			'src/lib/components/ui/__probe-client.ts',
			"import { apiClient } from '#lib/api/client.ts';\nexport const x = apiClient;\n"
		);
		expect(found.map((m) => m.message).join('\n')).toContain('#lib/api/client');
	});

	it('a deep import into feature internals is flagged', async () => {
		const found = await messages(
			'src/lib/components/ui/__probe-deep.ts',
			"import Row from '#lib/features/auth/components/SessionsList.svelte';\nexport const x = Row;\n"
		);
		expect(found.map((m) => m.message).join('\n')).toContain('Deep imports into feature internals');
	});

	it('an operator sub-barrel import (#lib/features/operator/<area>/index.ts) is legal', async () => {
		const found = await messages(
			'src/lib/components/ui/__probe-operator.ts',
			"import * as people from '#lib/features/operator/people/index.ts';\nexport const x = people;\n"
		);
		expect(found).toEqual([]);
	});

	it('a feature barrel import is legal', async () => {
		const found = await messages(
			'src/lib/components/ui/__probe-barrel.ts',
			"import * as auth from '#lib/features/auth/index.ts';\nexport const x = auth;\n"
		);
		expect(found).toEqual([]);
	});
});
