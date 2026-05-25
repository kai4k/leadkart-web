/**
 * dependency-cruiser — Gateway → Service → ViewModel → Component
 * boundaries enforced at static-analysis time.
 *
 * Maps to CLAUDE.md layering rules + arch tests #1-8, #126-130.
 *
 * Rule severity: every rule below is `error`. dependency-cruiser exit
 * code is non-zero on any violation, which fails CI.
 */
module.exports = {
	forbidden: [
		{
			name: 'no-circular',
			severity: 'error',
			comment:
				'Circular dependencies break tree-shaking + HMR + cause subtle init-order bugs. Refactor to a one-way arrow.',
			from: {},
			to: { circular: true }
		},
		{
			name: 'no-orphans',
			severity: 'warn',
			comment:
				'Orphan modules (no incoming + not entry points) are dead code. knip catches these too; warn-only here for redundancy.',
			from: {
				orphan: true,
				pathNot: [
					'(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
					'\\.d\\.ts$',
					'(^|/)tsconfig\\.json$',
					'(^|/)(babel|webpack|vite|vitest|playwright|svelte|eslint|stylelint)\\.config\\.[^/]+$',
					'src/app\\.(d\\.ts|html|css)$',
					'src/(hooks|service-worker)\\.(client|server)\\.ts$',
					'src/routes/.+\\+(page|layout|server|error)\\.(svelte|ts)$',
					'src/lib/api/generated/.*',
					'tests/.*'
				]
			},
			to: {}
		},
		{
			name: 'no-deprecated-core',
			severity: 'error',
			from: {},
			to: { dependencyTypes: ['core'], path: '^(punycode|domain|constants|sys|querystring)$' }
		},
		{
			name: 'no-deprecated-npm',
			severity: 'error',
			from: {},
			to: { dependencyTypes: ['deprecated'] }
		},
		{
			name: 'not-to-test',
			severity: 'error',
			comment: 'Source must not import from tests/.',
			from: { pathNot: '^(tests|__tests__|.*\\.test\\.ts|.*\\.spec\\.ts)' },
			to: { path: '^(tests|__tests__)' }
		},
		// ─── CLAUDE.md rule 1: Gateway → Service → ViewModel → Component ──
		{
			name: 'components-no-direct-api-client',
			severity: 'error',
			comment:
				'Components (src/lib/components, src/lib/layouts, src/routes) must not import $api/client directly — route through a feature gateway.',
			from: {
				path: '^src/(lib/(components|layouts)|routes)/'
			},
			to: { path: '^src/lib/api/client\\.ts$' }
		},
		{
			name: 'view-models-pure',
			severity: 'error',
			comment:
				'ViewModel files (*view-models.ts, src/lib/features/**/view-models/**) must be pure — no DOM, no SvelteKit nav/state, no API.',
			from: {
				path: '(view-models|viewmodels)\\.ts$|/view-models/'
			},
			to: {
				path: '^(src/lib/api/|src/\\$app|src/lib/features/.*/(api|service|stores)|src/routes/)'
			}
		},
		// ─── CLAUDE.md feature isolation (arch test #8) ──────────
		{
			name: 'no-cross-feature-imports',
			severity: 'error',
			comment:
				'Feature A must not import feature B internals. Shared logic moves to src/lib/ first.',
			from: { path: '^src/lib/features/([^/]+)/' },
			to: {
				path: '^src/lib/features/([^/]+)/',
				pathNot:
					'^src/lib/features/$1/|^src/lib/features/[^/]+/index\\.ts$|^src/lib/features/[^/]+/schemas\\.ts$|^src/lib/features/[^/]+/types\\.ts$'
			}
		},
		// ─── arch test #126-130 ────────────────────────────────
		{
			name: 'ui-primitives-pure',
			severity: 'error',
			comment: 'lib/components/* primitives must be feature-agnostic — no features imports.',
			from: { path: '^src/lib/components/' },
			to: { path: '^src/lib/features/' }
		},
		{
			name: 'api-client-pure',
			severity: 'error',
			comment: 'lib/api/* is a leaf — no features imports.',
			from: { path: '^src/lib/api/' },
			to: { path: '^src/lib/features/' }
		},
		{
			name: 'hooks-pure',
			severity: 'error',
			comment: 'lib/hooks/* is feature-agnostic — no features imports.',
			from: { path: '^src/lib/hooks/' },
			to: { path: '^src/lib/features/' }
		},
		{
			name: 'utils-leaf',
			severity: 'error',
			comment:
				'lib/utils/* is a leaf — no imports from lib/components, lib/features, lib/hooks, lib/layouts.',
			from: { path: '^src/lib/utils/' },
			to: {
				path: '^src/lib/(components|features|hooks|layouts|api|stores)/'
			}
		},
		{
			name: 'icons-pure',
			severity: 'error',
			comment: 'lib/icons/* is a leaf — no app code dependencies.',
			from: { path: '^src/lib/icons/' },
			to: {
				path: '^src/lib/(components|features|hooks|layouts|api|stores|utils)/'
			}
		},
		// ─── Layouts cannot reach into features (with auth exception) ──
		{
			name: 'layouts-no-feature-import',
			severity: 'error',
			comment: 'lib/layouts/* must not import from lib/features/* except auth (session shell).',
			from: { path: '^src/lib/layouts/' },
			to: {
				path: '^src/lib/features/',
				pathNot: '^src/lib/features/auth/'
			}
		}
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		exclude: {
			path: [
				'node_modules',
				'^\\.svelte-kit/',
				'^build/',
				'^coverage/',
				'^playwright-report/',
				'^test-results/',
				'\\.test\\.(ts|js)$',
				'\\.spec\\.(ts|js)$',
				'src/lib/api/generated/'
			]
		},
		tsPreCompilationDeps: true,
		tsConfig: { fileName: 'tsconfig.json' },
		enhancedResolveOptions: {
			exportsFields: ['exports'],
			conditionNames: ['import', 'require', 'node', 'default', 'svelte'],
			mainFields: ['module', 'main', 'svelte', 'types']
		},
		reporterOptions: {
			text: { highlightFocused: true }
		}
	}
};
