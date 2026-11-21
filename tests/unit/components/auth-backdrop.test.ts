/** The sign-in decoration is a quiet tint of the primary: no near-black marks, few of them, inert and static under reduced motion. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FAR, MID, NEAR } from '../../../src/lib/layouts/auth-particles.ts';

const svelte = readFileSync('src/lib/layouts/AuthBackdrop.svelte', 'utf8');

describe('auth backdrop', () => {
	const all = [...FAR, ...MID, ...NEAR];
	it('every mark is a tint of the primary ramp (no foreground, no literal colour)', () => {
		expect(all.length).toBeGreaterThan(0);
		for (const p of all) for (const c of [p.c1, p.c2]) expect(c).toMatch(/^--primary-\d{3}$/);
		expect(readFileSync('src/lib/layouts/auth-particles.ts', 'utf8')).not.toContain(
			"'--foreground'"
		);
		expect(svelte).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|oklch\(/i);
	});
	it('there are few of them and they stay faint', () => {
		expect(all.length).toBeLessThanOrEqual(48);
		for (const m of svelte.matchAll(/\.lk-particle[^{]*\{[^}]*?opacity:\s*([\d.]+)/g))
			expect(Number(m[1])).toBeLessThanOrEqual(0.7);
	});
	it('is decorative: aria-hidden, no pointer events, absolutely placed (no layout shift)', () => {
		expect(svelte).toContain('aria-hidden="true"');
		expect(svelte).toMatch(
			/\.lk-backdrop,[\s\S]*?position: absolute;[\s\S]*?pointer-events: none;/
		);
	});
	it('is STATIC: no keyframes, no animation property, so the glass card never re-blurs a moving backdrop (GD22)', () => {
		const style = svelte.slice(svelte.indexOf('<style>'));
		expect(style).not.toMatch(/@keyframes/);
		expect(style).not.toMatch(/\banimation(-[a-z]+)?\s*:/);
		expect(svelte).not.toContain('--delay');
	});
	it('prefers-reduced-motion removes the pointer transition and the pointer script', () => {
		expect(svelte).toMatch(
			/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.lk-particle\s*\{\s*transition: none;/
		);
		expect(svelte).toContain("matchMedia('(prefers-reduced-motion: reduce)').matches");
	});
});
