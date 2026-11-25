/**
 * Nothing a person reads is under 12px (global constraint). The guard covers ALL of `src/`: the retired
 * `--text-2xs` token (10-11px) is gone and may not return, no `text-[<12px]` arbitrary size, and no literal
 * `font-size` below 12px (px, or rem at 16px) in CSS or Svelte styles.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (d: string): string[] =>
	readdirSync(d).flatMap((n) =>
		statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]
	);
const FILES = walk('src').filter((f) => /\.(svelte|ts|css)$/.test(f));
const px = (value: number, unit: string) => (unit === 'px' ? value : value * 16);

const offenders = (re: RegExp, bad: (m: RegExpMatchArray) => boolean) =>
	FILES.flatMap((f) =>
		[...readFileSync(f, 'utf8').matchAll(re)].filter(bad).map((m) => `${f}: ${m[0]}`)
	);

describe('12px type floor across src/', () => {
	it('the --text-2xs token is not defined and nothing uses text-2xs', () => {
		expect(offenders(/text-2xs|--text-2xs/g, () => true)).toEqual([]);
	});

	it('no arbitrary text-[<size>] under 12px', () => {
		expect(
			offenders(/\btext-\[(\d*\.?\d+)(px|rem)\]/g, (m) => px(Number(m[1]), m[2]!) < 12)
		).toEqual([]);
	});

	it('no literal font-size under 12px in CSS or Svelte styles', () => {
		expect(
			offenders(/font-size:\s*(\d*\.?\d+)(px|rem)\b/g, (m) => px(Number(m[1]), m[2]!) < 12)
		).toEqual([]);
	});

	it('the matcher itself sees a violation (negative case)', () => {
		const re = /\btext-\[(\d*\.?\d+)(px|rem)\]/g;
		const hit = [...'class="text-[10px]"'.matchAll(re)].filter((m) => px(Number(m[1]), m[2]!) < 12);
		expect(hit).toHaveLength(1);
		expect(
			[...'text-[0.8rem]'.matchAll(re)].filter((m) => px(Number(m[1]), m[2]!) < 12)
		).toHaveLength(0);
	});
});
