import { describe, expect, it } from 'vitest';
import { findViolations } from '../../../scripts/arch/check-no-client-capability-guards.mjs';

/** Self-test of the arch gate: fixtures, not the repository. */
describe('check-no-client-capability-guards', () => {
	it('flags a goto in a file that reads session.can', () => {
		const src = `<script>\n  if (!session.can('x')) goto('/dashboard');\n</script>`;
		expect(findViolations(src)).toEqual([2]);
	});

	it('flags `can` imported under an alias', () => {
		const src = `import { can as mayDo } from '#lib/features/auth/index.ts';\nif (!mayDo(caps, 'x')) goto('/');`;
		expect(findViolations(src)).toEqual([2]);
	});

	it('flags canAny imported plainly, and the `capabilities` reference', () => {
		expect(
			findViolations(
				`import { canAny } from '#lib/features/auth/capabilities.ts';\nif (!canAny(c, [])) goto('/');`
			)
		).toEqual([2]);
		expect(findViolations(`const c = data.capabilities;\ngoto('/x');`)).toEqual([2]);
	});

	it('a marked call (same line or the line above) is allowed', () => {
		expect(findViolations(`session.can('x');\ngoto('/a'); // not-a-guard: opens the row`)).toEqual(
			[]
		);
		expect(findViolations(`session.can('x');\n// not-a-guard: syncs the URL\ngoto('/a');`)).toEqual(
			[]
		);
	});

	it('a marker is per call: a NEW unmarked goto in the same file is still caught', () => {
		const src = [
			`session.can('x');`,
			`goto('/a'); // not-a-guard: opens the row`,
			`if (!session.can('y')) goto('/dashboard');`
		].join('\n');
		expect(findViolations(src)).toEqual([3]);
	});

	it('an empty marker does not count', () => {
		expect(findViolations(`session.can('x');\ngoto('/a'); // not-a-guard:`)).toEqual([1 + 1]);
	});

	it('is quiet without a capability read, and ignores comments and strings in comments', () => {
		expect(findViolations(`goto('/a');`)).toEqual([]);
		expect(findViolations(`// session.can('x') is how it is checked\ngoto('/a');`)).toEqual([]);
		expect(findViolations(`<!-- capabilities -->\n<a onclick={() => goto('/a')}>x</a>`)).toEqual(
			[]
		);
	});

	it('importing a `can` that is never called is not a capability read', () => {
		expect(findViolations(`import { can } from './local-helper';\ngoto('/a');`)).toEqual([]);
	});
});
