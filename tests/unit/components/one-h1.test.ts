/**
 * "Exactly one <h1> per route" is kept by construction: the only places an `<h1>` may be written are
 * PageHeader (every signed-in page; it writes a `svelte:element`, tested below), the auth forms (the pages inside the auth frame), the error pages
 * and the dev styleguide/stories. Anything else is a second heading waiting to happen. The route walk
 * in `tests/a11y/routes.spec.ts` and `tests/e2e/tenant-context-banner.spec.ts` count the rendered `<h1>`.
 */
import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ALLOWED = [
	'src/lib/features/auth/components/SigninForm.svelte',
	'src/lib/features/auth/components/ForgotPasswordForm.svelte',
	'src/lib/features/auth/components/ResetPasswordForm.svelte',
	'src/lib/features/auth/components/ConfirmEmailChangeView.svelte',
	'src/routes/+error.svelte',
	'src/routes/(auth)/+error.svelte',
	'src/routes/(dev)/+error.svelte'
];
const isDevOrStory = (f: string) => f.includes('styleguide') || f.endsWith('.stories.svelte');

describe('where an <h1> is written', () => {
	const files = globSync('src/**/*.svelte').map((f) => f.replaceAll('\\', '/'));

	it('only in the allowed files', () => {
		const withH1 = files.filter(
			(f) => !isDevOrStory(f) && /^[ \t]*<h1[\s>]/m.test(readFileSync(f, 'utf8'))
		);
		expect(withH1.sort()).toEqual([...ALLOWED].sort());
	});

	it('PageHeader writes it once, as h1 or (nested) h2', () => {
		const src = readFileSync('src/lib/layouts/PageHeader.svelte', 'utf8');
		expect(src.match(/<svelte:element/g)).toHaveLength(1);
		expect(src).toContain("nested ? 'h2' : 'h1'");
	});
});
