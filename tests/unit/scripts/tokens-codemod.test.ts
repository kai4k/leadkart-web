import { describe, expect, it } from 'vitest';
import { transformSource } from '../../../scripts/codemods/tokens-to-semantic.mjs';

const run = (src: string, file = 'src/lib/features/x/X.svelte') =>
	transformSource(src, { file }) as {
		out: string;
		count: number;
		unmapped: Array<{ line: number; text: string }>;
	};

describe('tokens codemod: the plan fixture', () => {
	it('rewrites utilities with variants and opacity suffixes', () => {
		const { out } = run(
			'<p class="text-fg-muted hover:bg-bg-muted dark:border-border-strong ring-focus-ring/50"></p>'
		);
		expect(out).toBe(
			'<p class="text-muted-foreground hover:bg-muted dark:border-input ring-ring/50"></p>'
		);
	});

	it('rewrites cn() arguments, status ramps included (danger is destructive)', () => {
		const { out } = run("cn('bg-bg-elevated', x && 'text-danger-700 bg-danger-50')");
		expect(out).toBe("cn('bg-card', x && 'text-destructive bg-destructive-soft')");
	});

	it('rewrites custom properties in a <style> block', () => {
		const { out } = run('<style>.x { color: var(--color-fg-subtle); }</style>');
		expect(out).toBe('<style>.x { color: var(--muted-foreground); }</style>');
	});

	it('leaves the opaque hover token alone and renames primary-fg', () => {
		const { out } = run('<a class="bg-primary-hover text-primary-fg"></a>');
		expect(out).toBe('<a class="bg-primary-hover text-primary-foreground"></a>');
	});

	it('a second run changes nothing', () => {
		const first = run(
			[
				'<p class="text-fg-muted hover:bg-bg-muted dark:border-border-strong ring-focus-ring/50"></p>',
				"cn('bg-bg-elevated', x && 'text-danger-700 bg-danger-50')",
				'<style>.x { color: var(--color-fg-subtle); }</style>'
			].join('\n')
		);
		const second = run(first.out);
		expect(second.out).toBe(first.out);
		expect(second.count).toBe(0);
	});
});

describe('tokens codemod: the full L7 table', () => {
	it.each([
		['bg-bg', 'bg-background'],
		['bg-bg-elevated', 'bg-card'],
		['bg-bg-subtle', 'bg-muted'],
		['bg-bg-muted', 'bg-muted'],
		['text-fg', 'text-foreground'],
		['text-fg-muted', 'text-muted-foreground'],
		['text-fg-subtle', 'text-muted-foreground'],
		['text-fg-on-brand', 'text-primary-foreground'],
		['text-primary-fg', 'text-primary-foreground'],
		['border-border', 'border-border'],
		['border-border-strong', 'border-input'],
		['ring-focus-ring', 'ring-ring'],
		['bg-primary-active', 'bg-primary-hover'],
		['bg-primary-soft', 'bg-primary-soft'],
		['bg-brand-50', 'bg-primary-soft'],
		['bg-brand-600', 'bg-primary'],
		['text-brand-700', 'text-primary'],
		['text-brand-heading', 'text-primary'],
		['bg-success-50', 'bg-success-soft'],
		['bg-warning-100', 'bg-warning-soft'],
		['bg-info-500', 'bg-info'],
		['bg-danger-500', 'bg-destructive'],
		['text-info-700', 'text-info'],
		['text-danger-900', 'text-destructive'],
		['bg-secondary-500', 'bg-success'],
		['text-secondary-700', 'text-success'],
		['text-gray-500', 'text-muted-foreground'],
		['bg-gray-100', 'bg-muted'],
		['border-gray-200', 'border-border'],
		['ring-bg-elevated', 'ring-card'],
		['bg-fg-subtle', 'bg-muted-foreground'],
		['ring-border-strong', 'ring-input']
	])('%s becomes %s', (from, to) => {
		expect(run(`<i class="${from}"></i>`).out).toBe(`<i class="${to}"></i>`);
	});

	it('a status border keeps a quiet edge outside ui/ and is opaque inside it', () => {
		expect(run('<i class="border-danger-500"></i>').out).toBe(
			'<i class="border-destructive/40"></i>'
		);
		expect(run('<i class="border-success-300"></i>').out).toBe('<i class="border-success/40"></i>');
		expect(
			run('<i class="border-danger-500"></i>', 'src/lib/components/ui/ConfirmDialog.svelte').out
		).toBe('<i class="border-destructive"></i>');
	});
});

describe('tokens codemod: custom properties and arbitrary values', () => {
	it('rewrites var(--color-…) inside a Tailwind arbitrary value and the (--x) shorthand', () => {
		const { out } = run(
			'<i class="bg-[color-mix(in_oklch,var(--color-primary)_10%,var(--color-bg-elevated))] text-(--color-fg) shadow-[0_0_0_1px_var(--color-border-strong)]"></i>'
		);
		expect(out).toBe(
			'<i class="bg-[color-mix(in_oklch,var(--primary)_10%,var(--card))] text-(--foreground) shadow-[0_0_0_1px_var(--input)]"></i>'
		);
	});

	it('maps the ramps: brand-N to --primary-N, status steps to the soft or solid token', () => {
		const { out } = run(
			'a{color:var(--color-brand-500)} b{color:var(--color-success-50)} c{color:var(--color-danger-700)} d{color:var(--color-secondary-100)} e{color:var(--color-popover)}'
		);
		expect(out).toBe(
			'a{color:var(--primary-500)} b{color:var(--success-soft)} c{color:var(--destructive)} d{color:var(--success-soft)} e{color:var(--popover)}'
		);
	});

	it('leaves the names that are already semantic, and the legacy ones with no home', () => {
		const same =
			'a{color:var(--primary);background:var(--color-overlay);fill:var(--color-logo-purple)}';
		const { out } = run(same);
		expect(out).toBe(same);
	});
});

describe('tokens codemod: what it must not touch', () => {
	it('semantic utilities, physical utilities and imports are unchanged', () => {
		const src = [
			"import { cn } from '#lib/utils/cn.ts';",
			'<i class="bg-background text-foreground text-success bg-info-soft text-primary hover:bg-primary-hover left-2 ml-4"></i>'
		].join('\n');
		const { out, count } = run(src);
		expect(out).toBe(src);
		expect(count).toBe(0);
	});

	it('does not rewrite a name that merely contains a legacy name', () => {
		const src = '<i class="text-fg-mutedx bg-bg-elevatedish my-text-fg"></i>';
		expect(run(src).out).toBe(src);
	});
});

describe('tokens codemod: unmapped occurrences are listed with their line', () => {
	it('lists a gray step with no semantic home and a dynamic class', () => {
		const { unmapped } = run('<i class="bg-gray-500"></i>\n<i class="text-fg-${tone}"></i>');
		expect(unmapped).toEqual([
			{ line: 1, text: 'bg-gray-500' },
			{ line: 2, text: 'text-fg-${' }
		]);
	});
	it('lists a legacy custom property it has no mapping for', () => {
		const { unmapped } = run('a{color:var(--color-gray-500)}');
		expect(unmapped).toEqual([{ line: 1, text: '--color-gray-500' }]);
	});
});
