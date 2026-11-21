import { describe, expect, it } from 'vitest';
import {
	decodePreferences,
	encodePreferences,
	htmlAttributes
} from '#lib/features/preferences/codec.ts';
import { DEFAULT_PREFERENCES } from '#lib/features/preferences/schema.ts';

const b64 = (s: string) => btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

describe('preferences codec', () => {
	it('round-trips every field', () => {
		const p = {
			...DEFAULT_PREFERENCES,
			layout: 'semibox',
			mode: 'dark',
			colors: 'teal',
			darkPalette: 'zinc'
		} as const;
		expect(decodePreferences(encodePreferences(p))).toEqual(p);
	});
	it('stays under 300 bytes for the longest values', () => {
		const p = {
			layout: 'horizontal',
			navType: 'floating',
			contentWidth: 'default',
			sidebar: 'medium',
			mode: 'black-white',
			colors: 'leadkart',
			sidebarColors: 'purple',
			darkPalette: 'neutral',
			transparency: 'reduced'
		} as const;
		expect(`lk_ui=${encodePreferences(p)}`.length).toBeLessThanOrEqual(300);
	});
	it.each([undefined, null, '', '%%%not-base64', b64('not json'), b64('[1,2]'), 'x'.repeat(401)])(
		'falls back to defaults for %s',
		(raw) => expect(decodePreferences(raw as string)).toEqual(DEFAULT_PREFERENCES)
	);
	it('returns a fresh object for every bad cookie, so one request cannot change the next', () => {
		const a = decodePreferences(b64('[1,2]'));
		const b = decodePreferences(b64('[1,2]'));
		expect(a).not.toBe(b);
		expect(a).not.toBe(DEFAULT_PREFERENCES);
		(a as { mode: string }).mode = 'dark';
		expect(decodePreferences(b64('[1,2]'))).toEqual(DEFAULT_PREFERENCES);
		expect(DEFAULT_PREFERENCES.mode).toBe('light');
	});
	it('falls back per field and ignores unknown keys', () => {
		const raw = b64(
			JSON.stringify({ v: 1, mode: 'dark', colors: 'blue', layout: '"><script>', extra: 1 })
		);
		expect(decodePreferences(raw)).toEqual({ ...DEFAULT_PREFERENCES, mode: 'dark' });
	});
	it('ignores wrong-typed values and a __proto__ key', () => {
		const raw = b64(
			'{"__proto__":{"mode":"dark"},"mode":{"x":1},"layout":["vertical"],"colors":null}'
		);
		expect(decodePreferences(raw)).toEqual(DEFAULT_PREFERENCES);
	});
	it('rejects an oversized (401+ character) but otherwise valid cookie', () => {
		const long = b64(JSON.stringify({ v: 1, mode: 'dark', pad: 'y'.repeat(600) }));
		expect(long.length).toBeGreaterThan(400);
		expect(decodePreferences(long)).toEqual(DEFAULT_PREFERENCES);
	});
	it('writes exactly the 9 attributes from the enum', () => {
		expect(htmlAttributes(DEFAULT_PREFERENCES)).toBe(
			'data-layout="vertical" data-nav-type="default" data-content-width="default" data-sidebar="large" ' +
				'data-mode="light" data-colors="leadkart" data-sidebar-colors="light" data-dark-palette="default" ' +
				'data-transparency="glass"'
		);
	});
	it('transparency round-trips for each value, and the default is glass', () => {
		for (const transparency of ['glass', 'reduced', 'off'] as const)
			expect(
				decodePreferences(encodePreferences({ ...DEFAULT_PREFERENCES, transparency }))
			).toEqual({
				...DEFAULT_PREFERENCES,
				transparency
			});
		expect(DEFAULT_PREFERENCES.transparency).toBe('glass');
	});
	it('an old cookie written before the field existed decodes to glass', () => {
		const old = b64(
			JSON.stringify({
				v: 1,
				layout: 'semibox',
				navType: 'default',
				contentWidth: 'default',
				sidebar: 'large',
				mode: 'dark',
				colors: 'teal',
				sidebarColors: 'light',
				darkPalette: 'default'
			})
		);
		expect(decodePreferences(old)).toEqual({
			...DEFAULT_PREFERENCES,
			layout: 'semibox',
			mode: 'dark',
			colors: 'teal',
			transparency: 'glass'
		});
	});
	it.each([
		'<script>',
		'"><img src=x onerror=1>',
		'OFF',
		'solid',
		'tinted',
		' glass',
		'',
		null,
		1,
		['off'],
		{ a: 1 }
	])(
		'a hostile or unknown transparency %j falls back to glass and nothing else changes',
		(value) => {
			const raw = b64(JSON.stringify({ v: 1, mode: 'dark', transparency: value }));
			const decoded = decodePreferences(raw);
			expect(decoded).toEqual({ ...DEFAULT_PREFERENCES, mode: 'dark' });
			expect(htmlAttributes(decoded)).toContain('data-transparency="glass"');
		}
	);
	it('emits only enum members whatever hostile text every field carried', () => {
		const hostile = ['"><script>alert(1)</script>', 'a b', "x' onload='1", '\u0000', 'DARK '];
		for (const h of hostile) {
			const raw = b64(
				JSON.stringify({
					layout: h,
					navType: h,
					contentWidth: h,
					sidebar: h,
					mode: h,
					colors: h,
					sidebarColors: h,
					darkPalette: h,
					transparency: h
				})
			);
			const decoded = decodePreferences(raw);
			expect(decoded).toEqual(DEFAULT_PREFERENCES);
			const attrs = htmlAttributes(decoded);
			expect(attrs).not.toMatch(/[<>']/);
			expect(attrs.match(/="/g)).toHaveLength(9);
		}
	});
});
