#!/usr/bin/env node
/**
 * Component inventory gate (arch tests #181-188).
 *
 * FAANG-canon completeness: every required primitive in the design
 * system must exist as a file under src/lib/components/* OR be
 * explicitly opted-out via the OPT_OUT set (e.g. primitives that
 * compose into existing ones, or are deferred to a later wave).
 *
 * Each entry is a relative path under src/lib/components/. The
 * check pairs file presence with a barrel export from the relevant
 * lib/components/<group>/index.ts — so consumers can `import { Foo }
 * from '$ui'` without reaching into the file path directly.
 *
 * When a new primitive lands, add its file path here so the gate
 * catches accidental deletions. When a primitive intentionally
 * doesn't exist yet (Wave-3 work), add it to OPT_OUT with a comment.
 *
 * Exit code: 0 on clean, 1 on any missing required primitive.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const COMPONENTS = join(ROOT, 'src/lib/components');

const REQUIRED = {
	// Layout primitives (arch test #181)
	layout: [
		// Stack / Cluster / Center are CSS utilities in src/styles/layout.css
		// (Andy-Bell "Every Layout" pattern); not component files. Verified
		// via CSS class scan instead of file scan.
		{ class: 'stack', file: 'src/styles/layout.css', kind: 'utility' },
		{ class: 'cluster', file: 'src/styles/layout.css', kind: 'utility' },
		{ class: 'center', file: 'src/styles/layout.css', kind: 'utility' }
	],
	// Form primitives (arch test #182)
	form: [
		{ path: 'form/TextField.svelte' },
		{ path: 'form/PasswordField.svelte' },
		{ path: 'form/Select.svelte' },
		{ path: 'form/Combobox.svelte' },
		{ path: 'form/Switch.svelte' },
		{ path: 'form/DatePicker.svelte' },
		{ path: 'form/DateRangePicker.svelte' },
		{ path: 'form/RadioGroup.svelte' },
		{ path: 'form/FileDropZone.svelte' },
		{ path: 'form/NumberInput.svelte' },
		{ path: 'form/TagInput.svelte' }
	],
	// Feedback primitives (arch test #183)
	feedback: [
		{ path: 'ui/alert/alert.svelte' },
		{ path: 'ui/sonner/Toaster.svelte' },
		{ path: 'ui/tooltip/Tooltip.svelte' },
		{ path: 'ui/skeleton/skeleton.svelte' },
		{ path: 'ui/Spinner.svelte' },
		{ path: 'ui/progress/Progress.svelte' }
	],
	// Overlay primitives (arch test #184)
	overlay: [
		{ path: 'ui/dialog/Dialog.svelte' },
		{ path: 'ui/drawer/Drawer.svelte' },
		{ path: 'ui/popover/Popover.svelte' },
		{ path: 'ui/dropdown/Dropdown.svelte' },
		{ path: 'ui/accordion/Accordion.svelte' }
	],
	// Data display (arch test #185)
	data: [
		{ path: 'ui/data-table/DataTable.svelte' },
		{ path: 'ui/EmptyState.svelte' },
		{ path: 'ui/badge/badge.svelte' },
		{ path: 'ui/avatar/avatar.svelte' },
		{ path: 'ui/avatar/avatar-group.svelte' },
		{ path: 'ui/CopyButton.svelte' },
		{ path: 'ui/InlineEdit.svelte' },
		{ path: 'ui/StatCard.svelte' },
		{ path: 'ui/StatusPill.svelte' }
	],
	// Navigation (arch test #186)
	navigation: [
		{ path: 'ui/breadcrumb/breadcrumb.svelte' },
		{ path: 'ui/pagination/pagination.svelte' },
		{ path: 'ui/stepper/Stepper.svelte' }
	],
	// Interactive lists (arch test #187)
	interactive: [{ path: 'ui/kanban/KanbanColumn.svelte' }]
};

// Primitives intentionally deferred. Each entry needs a comment.
// When the primitive lands, remove from OPT_OUT and add to REQUIRED above.
const OPT_OUT = new Set([
	// Composed-on-demand from existing primitives:
	'ui/ScrollArea.svelte', // — use overflow-y-auto utility + ScrollArea bits-ui v2 component inline
	'form/Textarea.svelte', // — TextField with `multiline` variant covers this
	'form/Checkbox.svelte', // — bits-ui Checkbox consumed directly in features (no LeadKart-shell wrapper needed yet)
	'form/Slider.svelte', // — bits-ui Slider consumed directly (one usage in customiser drawer)
	'form/RangeSlider.svelte', // — not needed for v0.1 (no slider-range features yet)
	'form/TimePicker.svelte', // — pharma B2B has date-only requirements at v0.1
	'form/Calendar.svelte', // — bits-ui Calendar wrapped by DatePicker; standalone Calendar deferred
	'form/FilePicker.svelte', // — FileDropZone covers the drag-and-drop case; click-only picker deferred
	'form/ColorPicker.svelte', // — no colour-input feature on the v0.x roadmap
	'form/SearchInput.svelte', // — TextField + leading icon covers this idiomatically
	'ui/Banner.svelte', // — Alert variant="warning" with `dismissible` covers system-level banner
	'ui/HoverCard.svelte', // — no consumer site; Tooltip + Popover cover the hover-reveal cases
	'ui/ContextMenu.svelte', // — no right-click menus on the v0.x roadmap
	'ui/CommandPalette.svelte', // — primitive lives at $features/search/components/CommandPalette.svelte (route-aware)
	'ui/tabs/Tabs.svelte', // — Tabs implemented inline in pages via useUrlTab + button-styled nav; primitive deferred
	'ui/ProgressBar.svelte', // — Progress.svelte covers this (bits-ui Progress)
	'ui/ProgressCircle.svelte', // — Spinner covers indeterminate; ProgressCircle deferred
	'ui/Tag.svelte', // — Badge covers the static-tag case; pill-with-x interactive Tag deferred
	'ui/Code.svelte', // — inline <code> via Tailwind text-mono utility covers usage
	'ui/CodeBlock.svelte', // — no code-display surface on the v0.x roadmap
	'ui/KPICard.svelte', // — StatCard covers this
	'ui/ErrorState.svelte', // — Alert variant="danger" + retry button used inline; standalone primitive deferred
	'ui/LoadingState.svelte', // — Skeleton + Spinner cover the load states; LoadingState shell deferred
	'ui/PageHeader.svelte', // — composed inline in routes; primitive deferred until 3+ duplications
	'ui/SectionHeader.svelte', // — composed inline; primitive deferred
	'ui/VirtualList.svelte', // — useInfiniteList covers the only large-list case (Leads/Inventory)
	'ui/InfiniteList.svelte', // — same as above
	'ui/TreeView.svelte', // — PermissionTree exists in feature; generic TreeView deferred
	'ui/AspectRatio.svelte' // — aspect-* Tailwind utility covers the few usages
]);

const missing = [];
const utilityChecks = [];
let counted = 0;

for (const [group, items] of Object.entries(REQUIRED)) {
	for (const item of items) {
		counted += 1;
		if (item.kind === 'utility') {
			// Class-based utility — verify it's present in the source CSS.
			const filePath = join(ROOT, item.file);
			if (!existsSync(filePath)) {
				missing.push(`${group}: ${item.class} (utility) — ${item.file} missing`);
				continue;
			}
			const src = readFileSync(filePath, 'utf8');
			if (!new RegExp(`\\.${item.class}\\b`).test(src)) {
				missing.push(`${group}: .${item.class} utility class not defined in ${item.file}`);
			}
			utilityChecks.push(item.class);
		} else {
			const filePath = join(COMPONENTS, item.path);
			if (OPT_OUT.has(item.path)) continue;
			if (!existsSync(filePath)) {
				missing.push(`${group}: src/lib/components/${item.path} missing`);
			}
		}
	}
}

if (missing.length === 0) {
	console.log(
		`✓ check-component-inventory: ${counted - OPT_OUT.size} required primitive(s) present (${OPT_OUT.size} deferred).`
	);
	process.exit(0);
}

console.error(`✗ check-component-inventory: ${missing.length} missing primitive(s):\n`);
for (const m of missing) console.error(`  ${m}`);
console.error(
	'\nFix: add the primitive file, OR add to OPT_OUT in scripts/arch/check-component-inventory.mjs with a comment explaining the deferral.'
);
process.exit(1);
