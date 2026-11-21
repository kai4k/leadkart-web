/** The G12 device probe (tests/e2e/fixtures/material-probe.html) repeats the light bar recipe as literals: keep it in step with materials.css. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const probe = readFileSync('tests/e2e/fixtures/material-probe.html', 'utf8');
const materials = readFileSync('src/styles/theme/materials.css', 'utf8');
const num = (re: RegExp, s: string) => Number(re.exec(s)![1]);

describe('material probe', () => {
	it('uses the bar recipe of materials.css (blur, saturate, contrast, light fill)', () => {
		expect(num(/--material-bar-blur:\s*(\d+)px/, materials)).toBe(
			num(/backdrop-filter:\s*blur\((\d+)px\)/, probe)
		);
		expect(num(/--material-bar-saturate:\s*([\d.]+)/, materials)).toBe(
			num(/saturate\(([\d.]+)\)/, probe)
		);
		expect(num(/--material-bar-contrast:\s*([\d.]+)/, materials)).toBe(
			num(/contrast\(([\d.]+)\)/, probe)
		);
		expect(num(/var\(--card\) (\d+)%/, materials)).toBe(num(/#fff (\d+)%, transparent/, probe));
	});
	it('has no inline script and loads only the external probe script', () => {
		expect(probe.match(/<script/g)).toHaveLength(1);
		expect(probe).toContain('<script src="./material-probe.js"></script>');
	});
});
