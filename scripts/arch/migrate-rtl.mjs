#!/usr/bin/env node
/**
 * One-shot RTL migration script — converts Tailwind physical utilities
 * to logical equivalents across src/**\/*.svelte. Run once; this file
 * stays in the repo as a reference but is not wired into CI (the gate
 * is scripts/arch/check-rtl-safety.mjs).
 *
 *   ml-N / mr-N → ms-N / me-N
 *   pl-N / pr-N → ps-N / pe-N
 *   text-left / text-right → text-start / text-end
 *   border-l(-N) / border-r(-N) → border-s(-N) / border-e(-N)
 *   left-N / right-N → start-N / end-N
 *
 * Files with intentional physical positioning are listed in SKIP.
 */
import { readFileSync, writeFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const replacements = [
	[/\bml-(\d+(?:\.\d+)?)\b/g, 'ms-$1'],
	[/\bmr-(\d+(?:\.\d+)?)\b/g, 'me-$1'],
	[/\bpl-(\d+(?:\.\d+)?)\b/g, 'ps-$1'],
	[/\bpr-(\d+(?:\.\d+)?)\b/g, 'pe-$1'],
	[/\btext-right\b/g, 'text-end'],
	[/\btext-left\b/g, 'text-start'],
	[/\bborder-l-(\d+)\b/g, 'border-s-$1'],
	[/\bborder-r-(\d+)\b/g, 'border-e-$1'],
	[/\bborder-l\b(?!-)/g, 'border-s'],
	[/\bborder-r\b(?!-)/g, 'border-e'],
	[/\bleft-(\d+(?:\.\d+)?|auto)\b/g, 'start-$1'],
	[/\bright-(\d+(?:\.\d+)?|auto)\b/g, 'end-$1']
];

const SKIP = new Set([
	'src/lib/layouts/AppShell.svelte',
	'src/routes/(dev)/styleguide/+page.svelte'
]);

const files = globSync('src/**/*.svelte', { cwd: ROOT });
let touched = 0;
for (const rel of files) {
	const norm = rel.replaceAll('\\', '/');
	if (SKIP.has(norm)) continue;
	const abs = join(ROOT, rel);
	const src = readFileSync(abs, 'utf8');
	let next = src;
	for (const [re, to] of replacements) {
		next = next.replace(re, to);
	}
	if (next !== src) {
		writeFileSync(abs, next);
		touched++;
		console.log('migrated:', norm);
	}
}
console.log(`Done — migrated ${touched} file(s).`);
