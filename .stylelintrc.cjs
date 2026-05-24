/**
 * Stylelint — strict gate on design-token discipline.
 *
 * Enforces CLAUDE.md rule 7 ("design tokens are the only source of truth
 * for visual decisions") at lint-time, not at PR-review time. Maps to
 * arch-tests #23-30, #135-140, #145-150.
 *
 * Philosophy: format-level rules (lightness-notation, hue-degree-notation,
 * import-notation) are DISABLED — they fight the codebase's existing
 * oklch-with-raw-numbers convention. The architectural rules (no inline
 * hex outside tokens, no !important, declaration-strict-value for color
 * properties, function/at-rule allowlists) are KEPT and enforced.
 *
 * Scope: src/styles/*.css + Svelte <style> blocks. tokens.css is the
 * ONLY file allowed to declare raw oklch/hex/rgb literals — every other
 * file consumes via var(--*).
 */
module.exports = {
	extends: ['stylelint-config-standard'],
	customSyntax: 'postcss-html',
	plugins: ['stylelint-declaration-strict-value'],
	overrides: [
		{
			files: ['**/*.svelte'],
			customSyntax: 'postcss-html'
		},
		{
			files: ['**/*.css'],
			customSyntax: 'postcss'
		},
		{
			// tokens.css is the source of truth — raw oklch/hex/rgb allowed here.
			files: ['src/styles/tokens.css'],
			rules: {
				'color-no-hex': null,
				'scale-unlimited/declaration-strict-value': null
			}
		},
		{
			// src/styles/*.css — global utility + base layer. !important is
			// canonical for utility classes (Tailwind ships it on all utilities
			// for the same reason) and for reduced-motion overrides which
			// MUST defeat author styles. Deprecated `clip` is also canon for
			// the .sr-only pattern (paired with modern clip-path: inset(50%)
			// for newer browsers).
			files: ['src/styles/*.css'],
			rules: {
				'declaration-no-important': null,
				'property-no-deprecated': null
			}
		}
	],
	rules: {
		// ─── COLOUR DISCIPLINE (arch tests #23-26) ──────────────────
		// No raw hex literals outside tokens.css.
		'color-no-hex': true,
		// No raw rgb/hsl/oklch outside tokens.css — components reference
		// var(--color-*) tokens, which then resolve to the raw values in
		// tokens.css. The override above unlocks tokens.css itself.
		'scale-unlimited/declaration-strict-value': [
			['/color$/', 'fill', 'stroke', 'background-color', 'border-color'],
			{
				ignoreValues: [
					'currentColor',
					'inherit',
					'initial',
					'unset',
					'revert',
					'transparent',
					'none',
					'/^var\\(--/'
				],
				disableFix: true
			}
		],

		// ─── At-rule allowlist (Tailwind 4 + custom) ────────────────
		'at-rule-no-unknown': [
			true,
			{
				ignoreAtRules: [
					'tailwind',
					'apply',
					'variants',
					'responsive',
					'screen',
					'theme',
					'utility',
					'custom-variant',
					'source',
					'layer',
					'config',
					'plugin',
					'reference',
					'import'
				]
			}
		],

		// ─── Architectural bans ─────────────────────────────────────
		'declaration-no-important': true,

		// ─── Function allowlist (Tailwind 4 + native CSS color spaces) ─
		'function-no-unknown': [
			true,
			{
				ignoreFunctions: [
					'theme',
					'screen',
					'oklch',
					'oklab',
					'lab',
					'lch',
					'color-mix',
					'clamp',
					'min',
					'max'
				]
			}
		],

		// ─── Format rules (DISABLED — fight existing canon) ─────────
		// These are notation preferences, not architectural concerns.
		// The codebase uses oklch(0.96 0.008 268) form; stylelint-config-
		// standard wants oklch(96% 0.008 268deg). Both are valid CSS.
		'lightness-notation': null,
		'hue-degree-notation': null,
		'alpha-value-notation': null,
		'color-function-notation': null,
		'color-hex-length': null,
		'color-function-alias-notation': null,
		'import-notation': null,
		'value-keyword-case': null,
		'media-feature-range-notation': null,
		'media-query-no-invalid': null,
		'shorthand-property-no-redundant-values': null,
		'declaration-block-no-redundant-longhand-properties': null,
		'no-duplicate-selectors': null,
		'no-descending-specificity': null,
		'no-empty-source': null,

		// ─── Layout rules (DISABLED — current codebase style) ───────
		'declaration-empty-line-before': null,
		'comment-empty-line-before': null,
		'rule-empty-line-before': null,
		'at-rule-empty-line-before': null,
		'custom-property-empty-line-before': null,
		'custom-property-pattern': null,
		'selector-class-pattern': null,
		'keyframes-name-pattern': null,
		// Safari vendor prefixes are required for backdrop-filter +
		// mask-repeat support — keeping them is canonical, not legacy.
		'property-no-vendor-prefix': null,
		'value-no-vendor-prefix': null,
		'at-rule-no-vendor-prefix': null,
		'selector-no-vendor-prefix': null,
		'media-feature-name-no-vendor-prefix': null,
		'property-no-unknown': [true, { ignoreSelectors: [':export'] }],
		'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
		'selector-pseudo-element-no-unknown': [true, { ignorePseudoElements: ['global', 'local'] }],
		// Tailwind 4 + arbitrary-value class syntax breaks these.
		'no-invalid-position-at-import-rule': null,
		'no-irregular-whitespace': null
	}
};
