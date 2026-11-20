/**
 * Self-test of scripts/arch/check-i18n-keys.mjs: a key the code uses must exist in en.json; dynamic
 * keys only through the registry (every expansion checked); the real repo passes.
 */
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { checkI18nKeys, REGISTRY, stripComments } from '../../../scripts/arch/check-i18n-keys.mjs';

const en = { common: { save: 'Save', close: 'Close' }, nav: { items: { team: 'Team' } } };
const read = () => '';
const run = (files: Record<string, string>, registry = REGISTRY) =>
	checkI18nKeys({ files: new Map(Object.entries(files)), en, read, registry }).problems;

describe('check-i18n-keys', () => {
	it('passes a literal call whose key exists', () => {
		expect(run({ 'a.svelte': `<p>{$_('common.save')}</p>` })).toEqual([]);
	});

	it('fails a literal call whose key is missing (a typo)', () => {
		const p = run({ 'a.svelte': `<p>{$_('common.sav')}</p>` });
		expect(p).toHaveLength(1);
		expect(p[0]).toContain('missing key "common.sav"');
	});

	it('fails a key-shaped string in a config table whose key is missing', () => {
		const p = run({ 'config.ts': `export const T = { labelKey: 'nav.items.teem' };` });
		expect(p[0]).toContain('missing key "nav.items.teem"');
	});

	it('does not read a key from a comment', () => {
		expect(run({ 'a.ts': `// $_('common.nope') and 'common.nope'\n/* 'common.nope' */` })).toEqual(
			[]
		);
		expect(stripComments("x = 'https://a.b'; // c")).toContain('https://a.b');
	});

	it('passes a registered dynamic prefix when every expansion exists', () => {
		const registry = [{ template: 'nav.items.${}', expand: () => ['nav.items.team'] }];
		expect(run({ 'n.svelte': '{$_(`nav.items.${item.key}`)}' }, registry)).toEqual([]);
	});

	it('fails a registered dynamic prefix when one expansion is missing', () => {
		const registry = [
			{ template: 'nav.items.${}', expand: () => ['nav.items.team', 'nav.items.gone'] }
		];
		const p = run({ 'n.svelte': '{$_(`nav.items.${item.key}`)}' }, registry);
		expect(p).toHaveLength(1);
		expect(p[0]).toContain('nav.items.gone');
	});

	it('fails a registry entry that enumerates nothing (its source table moved)', () => {
		const registry = [{ template: 'nav.items.${}', expand: () => [] }];
		expect(run({ 'n.svelte': '{$_(`nav.items.${item.key}`)}' }, registry)[0]).toContain(
			'enumerated no keys'
		);
	});

	it('fails an unregistered template-literal key', () => {
		const p = run({ 'n.svelte': '{$_(`common.${name}`)}' });
		expect(p).toHaveLength(1);
		expect(p[0]).toContain('not in the registry');
	});

	it('ignores a template that does not start in an en.json namespace', () => {
		expect(run({ 'c.ts': 'throw new Error(`config.${key} read`)' })).toEqual([]);
	});

	it('reports unused keys without failing', () => {
		const r = checkI18nKeys({ files: new Map(), en, read });
		expect(r.problems).toEqual([]);
		expect(r.unused).toContain('common.close');
	});
});

describe('the real repository', () => {
	it('every key used in code exists in en.json', () => {
		const out = execFileSync(process.execPath, ['scripts/arch/check-i18n-keys.mjs'], {
			encoding: 'utf8'
		});
		expect(out).toContain('✓ check-i18n-keys');
	});
});
